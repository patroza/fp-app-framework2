import {
  AsyncResult,
  E,
  RTE,
  O,
  pipe,
  ReadonlyNonEmptyArray,
} from "@fp-app/fp-ts-extensions"

import Event from "../../event"
import { utils } from "@fp-app/framework"

const logger = utils.getLogger("publish")

const publish = (
  getMany: <TInput extends Event>(
    evt: TInput,
  ) => O.Option<ReadonlyNonEmptyArray<RTE.ReaderTaskEither<TInput, Error, void>>>,
): publishType => <TInput extends Event>(evt: TInput) => async () => {
  const hndl = pipe(getMany(evt))
  logger.log(
    `Publishing Domain event: ${evt.constructor.name} (${
      O.isSome(hndl) ? hndl.value.length : 0
    } handlers)`,
    JSON.stringify(evt),
  )

  if (O.isNone(hndl)) {
    return E.success()
  }

  for (const evtHandler of hndl.value) {
    logger.log(`Handling ${evtHandler.name}`)
    const r = await evtHandler(evt)()
    if (E.isErr(r)) {
      return E.err(r.left)
    }
  }

  logger.log(`Published event: ${evt.constructor.name}`)
  return E.success()
}

export default publish

// tslint:disable-next-line:max-line-length
export type publishType = <TInput extends Event>(
  evt: TInput,
) => AsyncResult<void, Error>
