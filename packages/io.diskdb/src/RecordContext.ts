import {
  ConnectionException,
  Event,
  OptimisticLockException,
  RecordContext,
  isTruthyFilter,
  CouldNotAquireDbLockException,
} from "@fp-app/framework"
import { pipe, O, RT, T, TO } from "@fp-app/fp-ts-extensions"
import { lock } from "proper-lockfile"
import { deleteFile, exists, readFile, writeFile } from "./utils"
import { assertIsNotUndefined } from "@fp-app/framework"
import { flow } from "fp-ts/lib/function"
import { sequenceT } from "fp-ts/lib/Apply"

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

  readonly load: RT.ReaderTask<string, O.Option<T>> = id => {
    const cachedRecord = this.cache.get(id)
    if (cachedRecord) {
      return TO.some(cachedRecord.data)
    }
    return pipe(
      tryReadFromDb(this.type, id),
      TO.map(serializedStr => JSON.parse(serializedStr) as SerializedDBRecord),
      TO.map(({ data, version }) => ({ data: this.deserializer(data), version })),
      TO.map(({ data, version }) => {
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

  readonly intSave = (
    forEachSave?: (item: T) => Promise<void>,
    forEachDelete?: (item: T) => Promise<void>,
  ): Promise<void> =>
    tRunSequentially(
      () => this.handleDeletions(forEachDelete),
      () => this.handleInsertionsAndUpdates(forEachSave),
    )
  private readonly handleDeletions = (
    forEachDelete?: (item: T) => Promise<void>,
  ): Promise<void> =>
    tRunSequentially(
      ...this.removals
        .map(e =>
          [
            () => this.deleteRecord(e),
            forEachDelete && (() => forEachDelete(e)),
            () => Promise.resolve(this.cache.delete(e.id)),
          ].filter(isTruthyFilter),
        )
        .flat(),
    )

  private readonly handleInsertionsAndUpdates = async (
    forEachSave?: (item: T) => Promise<void>,
  ): Promise<void> =>
    tRunSequentially(
      ...Array.from(this.cache.values())
        .map(({ data }) =>
          [
            () => this.saveRecord(data),
            forEachSave && (() => forEachSave(data)),
          ].filter(isTruthyFilter),
        )
        .flat(),
    )

  private readonly saveRecord = async (record: T) => {
    const cachedRecord = this.cache.get(record.id)
    assertIsNotUndefined(cachedRecord, { cachedRecord })
    if (!cachedRecord.version) {
      return await this.actualSave(record, cachedRecord.version)
    }

    return await lockRecordOnDisk(
      this.type,
      record.id,
      pipe(
        tryReadFromDb(this.type, record.id),
        TO.map(s => JSON.parse(s) as SerializedDBRecord),
        TO.do(({ version }) => {
          if (version !== cachedRecord.version) {
            throw new OptimisticLockException(this.type, record.id)
          }
        }),
        TO.fold(
          () => T.of(void 0),
          ({ version }) => () => this.actualSave(record, version),
        ),
      ),
    )
  }

  private readonly deleteRecord = (record: T): Promise<void> =>
    lockRecordOnDisk(this.type, record.id, () =>
      deleteFile(getFilename(this.type, record.id)),
    )

  private readonly actualSave = async (record: T, version: number) => {
    const data = this.serializer(record)

    const serialized = JSON.stringify({ version: version + 1, data })
    await writeFile(getFilename(this.type, record.id), serialized, {
      encoding: "utf-8",
    })
    this.cache.set(record.id, { version, data: record })
  }
}

const runSequentially = async <T>(...taskCreators: Array<T.Task<T>>): Promise<T[]> => {
  if (taskCreators.length) {
    const taskSequence = sequenceT(T.task)(taskCreators[0], ...taskCreators.slice(1))
    return await taskSequence()
  } else {
    return []
  }
}

const terminate = async (promise: Promise<any>) => {
  await promise
}

const tRunSequentially = flow(runSequentially, terminate)

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

const lockRecordOnDisk = async <T>(type: string, id: string, cb: T.Task<T>) => {
  try {
    const release = await lock(getFilename(type, id))
    try {
      return await cb()
    } finally {
      await release()
    }
  } catch (err) {
    throw new CouldNotAquireDbLockException(type, id, err as Error)
  }
}

const tryReadFromDb = (type: string, id: string): TO.TaskOption<string> => async () => {
  try {
    const filePath = getFilename(type, id)
    if (!(await exists(filePath))) {
      return O.none
    }
    return O.some(await readFile(filePath, { encoding: "utf-8" }))
  } catch (err) {
    throw new ConnectionException(err)
  }
}

export const getFilename = (type: string, id: string) => `./data/${type}-${id}.json`
