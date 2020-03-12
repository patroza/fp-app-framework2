import Event from "../event"
import { publishType, resolveEventType } from "./mediator"
import { O, TE, RTE } from "@fp-app/fp-ts-extensions"

const processReceivedEvent = ({
  publish,
  resolveEvent,
}: {
  resolveEvent: resolveEventType
  publish: publishType
}): RTE.ReaderTaskEither<string, Error, void> => body => {
  const { payload, type } = JSON.parse(body) as EventDTO
  const event = resolveEvent({ type, payload })
  if (O.isNone(event)) {
    return TE.ok(void 0)
  }
  // TODO: process the result
  const publishTask = publish(event.value)
  return publishTask
}

export interface EventDTO {
  type: string
  payload: any
}

const createEventDTO = (evt: Event): EventDTO => ({
  payload: evt,
  type: evt.constructor.name,
})

export { createEventDTO, processReceivedEvent }
