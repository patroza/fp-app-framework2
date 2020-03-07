import { AsyncResult, E, RTE } from "@fp-app/fp-ts-extensions"

import Event from "../../event"
import { getLogger } from "../../utils"

const logger = getLogger("publish")

const publish = (
  getMany: <TInput extends Event>(
    evt: TInput,
  ) => RTE.ReaderTaskEither<TInput, Error, void>[],
): publishType => <TInput extends Event>(evt: TInput) => async () => {
  const hndl = getMany(evt)
  logger.log(
    `Publishing Domain event: ${evt.constructor.name} (${
      hndl ? hndl.length : 0
    } handlers)`,
    JSON.stringify(evt),
  )

  if (!hndl) {
    return E.success()
  }

  for (const evtHandler of hndl) {
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
