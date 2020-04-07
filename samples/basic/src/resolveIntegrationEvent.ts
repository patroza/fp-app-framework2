import * as FW from "@fp-app/framework"
import { CustomerRequestedChanges } from "./TrainTrip/eventhandlers/integration.events"
import { O, t, E, pipe } from "@fp-app/fp-ts-extensions"

const resolveEvent = (): resolveEventType => (unknownEvent) => {
  FW.utils.logger.log("Received integration event", unknownEvent)
  const parsedEvent = SupportedIntegrationEvents.decode(unknownEvent)
  return pipe(
    parsedEvent,
    E.fold(
      () => {
        FW.utils.logger.warn(
          "Received event, but have no handler, or invalid payload: ",
          parsedEvent,
        )
        return O.none
      },
      (evt) => {
        switch (evt.type) {
          case "CustomerRequestedChanges":
            return O.some(
              new CustomerRequestedChanges(
                evt.payload.trainTripId,
                evt.payload.itineraryId,
              ),
            )
          case "SomeOther":
            throw new Error("This is just for demo")
        }
      },
    ),
  )
}

const SomeOtherEventDTO = t.type({
  type: t.keyof({ SomeOther: null }),
  payload: t.type({}),
})

const CustomerRequestedChangesDTO = t.type({
  type: t.keyof({ CustomerRequestedChanges: null }),
  payload: t.type({ trainTripId: t.string, itineraryId: t.string }),
})
const SupportedIntegrationEvents = t.union([
  CustomerRequestedChangesDTO,
  SomeOtherEventDTO,
])
export type CustomerRequestedChangesDTO = t.TypeOf<typeof CustomerRequestedChangesDTO>

export default resolveEvent
