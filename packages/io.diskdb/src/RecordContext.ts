import {
  ConnectionError,
  CouldNotAquireDbLockError,
  DbError,
  Event,
  OptimisticLockError,
  RecordContext,
  RecordNotFound,
  isTruthyFilter,
} from "@fp-app/framework"
import {
  pipe,
  AsyncResult,
  E,
  TE,
  trampoline,
  ToolDeps,
  RTE,
} from "@fp-app/fp-ts-extensions"
import { lock } from "proper-lockfile"
import { deleteFile, exists, readFile, writeFile } from "./utils"
import { assertIsNotUndefined } from "@fp-app/framework"

// tslint:disable-next-line:max-classes-per-file
export default class DiskRecordContext<T extends DBRecord> implements RecordContext<T> {
  private cache = new Map<string, CachedRecord<T>>()
  private removals: T[] = []

  constructor(
    private readonly type: string,
    private readonly serializer: (record: T) => string,
    private readonly deserializer: (serialized: string) => T,
  ) {}

  readonly add = (record: T) => {
    this.cache.set(record.id, { version: 0, data: record })
  }

  readonly remove = (record: T) => {
    this.removals.push(record)
  }

  readonly load: RTE.ReaderTaskEither<string, DbError, T> = id => {
    const cachedRecord = this.cache.get(id)
    if (cachedRecord) {
      return TE.ok(cachedRecord.data)
    }
    return pipe(
      tryReadFromDb(this.type, id),
      TE.map(serializedStr => JSON.parse(serializedStr) as SerializedDBRecord),
      TE.map(({ data, version }) => ({ data: this.deserializer(data), version })),
      TE.map(({ data, version }) => {
        this.cache.set(id, { version, data })
        return data
      }),
    )
  }

  // Internal
  readonly intGetAndClearEvents = () => {
    const items = [...this.cache.values()].map(x => x.data).concat(this.removals)
    return items.reduce(
      (prev, cur) => prev.concat(cur.intGetAndClearEvents()),
      [] as Event[],
    )
  }

  // TODO: reader should be single object input
  readonly intSave = (
    forEachSave?: (item: T) => AsyncResult<void, DbError>,
    forEachDelete?: (item: T) => AsyncResult<void, DbError>,
  ): AsyncResult<void, DbError> =>
    pipe(
      this.handleDeletions(forEachDelete),
      TE.chain(() => this.handleInsertionsAndUpdates(forEachSave)),
    )

  private readonly handleDeletions = (
    forEachDelete?: (item: T) => AsyncResult<void, DbError>,
  ): AsyncResult<void, DbError> =>
    TE.chainTasks(
      this.removals
        .map(e =>
          [
            this.deleteRecord(e),
            forEachDelete && forEachDelete(e),
            TE.fromEither(E.exec(() => this.cache.delete(e.id))),
          ].filter(isTruthyFilter),
        )
        .flat(),
    )

  private readonly handleInsertionsAndUpdates = (
    forEachSave?: (item: T) => AsyncResult<void, DbError>,
  ): AsyncResult<void, DbError> =>
    TE.chainTasks(
      Array.from(this.cache.values())
        .map(({ data }) =>
          [this.saveRecord(data), forEachSave && forEachSave(data)].filter(
            isTruthyFilter,
          ),
        )
        .flat(),
    )

  private readonly saveRecord = trampoline(
    (_: ToolDeps<DbError>) => (record: T): AsyncResult<void, DbError> => {
      const cachedRecord = this.cache.get(record.id)
      assertIsNotUndefined(cachedRecord, { cachedRecord })

      return !cachedRecord.version
        ? this.actualSave(record, cachedRecord.version)
        : lockRecordOnDisk(
            this.type,
            record.id,
            pipe(
              tryReadFromDb(this.type, record.id),
              TE.map(s => JSON.parse(s) as SerializedDBRecord),
              TE.chain(
                _.RTE.liftErr(
                  TE.fromPredicate(
                    ({ version }) => version === cachedRecord.version,
                    () => new OptimisticLockError(this.type, record.id),
                  ),
                ),
              ),
              TE.chain(
                _.RTE.liftErr(({ version }) => this.actualSave(record, version)),
              ),
            ),
          )
    },
  )

  private readonly deleteRecord = (record: T): AsyncResult<void, DbError> =>
    lockRecordOnDisk(
      this.type,
      record.id,
      pipe(
        TE.right(void 0),
        TE.chain(() =>
          TE.tryExecute(() => deleteFile(getFilename(this.type, record.id))),
        ),
      ),
    )

  private readonly actualSave = (record: T, version: number) =>
    TE.tryExecute<void, any>(async () => {
      const data = this.serializer(record)

      const serialized = JSON.stringify({ version: version + 1, data })
      await writeFile(getFilename(this.type, record.id), serialized, {
        encoding: "utf-8",
      })
      this.cache.set(record.id, { version, data: record })
    })
}

interface DBRecord {
  id: string
  intGetAndClearEvents: () => Event[]
}
interface SerializedDBRecord {
  version: number
  data: string
}
interface CachedRecord<T> {
  version: number
  data: T
}

const lockRecordOnDisk = <T>(type: string, id: string, cb: AsyncResult<T, DbError>) =>
  pipe(
    tryLock(type, id),
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    TE.chain(release => () => cb().finally(release)),
  )

const tryLock = (
  type: string,
  id: string,
): AsyncResult<() => Promise<void>, CouldNotAquireDbLockError> =>
  TE.tryCatch(
    () => lock(getFilename(type, id)),
    er => new CouldNotAquireDbLockError(type, id, er as Error),
  )

const tryReadFromDb = (
  type: string,
  id: string,
): AsyncResult<string, DbError> => async () => {
  try {
    const filePath = getFilename(type, id)
    if (!(await exists(filePath))) {
      return E.err(new RecordNotFound(type, id))
    }
    return E.ok(await readFile(filePath, { encoding: "utf-8" }))
  } catch (err) {
    return E.err(new ConnectionError(err))
  }
}

export const getFilename = (type: string, id: string) => `./data/${type}-${id}.json`
