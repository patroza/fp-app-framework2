import { publishType, resolveEventType } from "./mediator"
import { O, TE, RTE } from "@fp-app/fp-ts-extensions"

const processReceivedEvent = ({
  publish,
  resolveEvent,
}: {
  resolveEvent: resolveEventType
  publish: publishType
}): RTE.ReaderTaskEither<string, Error, void> => body => {
  const event = resolveEvent(JSON.parse(body))
  if (O.isNone(event)) {
    return TE.ok(void 0)
  }
  // TODO: process the result
  const publishTask = publish(event.value)
  return publishTask
}

export { processReceivedEvent }
