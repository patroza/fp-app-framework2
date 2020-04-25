import * as FW from "@fp-app/framework"
import * as FWC from "@fp-app/framework-classic"
import { CustomerRequestedChanges } from "./TrainTrip/eventhandlers/integration.events"
import { O, I, E, pipe } from "@fp-app/fp-ts-extensions"

const resolveEvent = (): FWC.resolveEventType => (unknownEvent) => {
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

const SomeOtherEventDTO = I.type({
  type: I.keyof({ SomeOther: null }),
  payload: I.type({}),
})

const CustomerRequestedChangesDTO = I.type({
  type: I.keyof({ CustomerRequestedChanges: null }),
  payload: I.type({ trainTripId: I.string, itineraryId: I.string }),
})
const SupportedIntegrationEvents = I.union([
  CustomerRequestedChangesDTO,
  SomeOtherEventDTO,
])
export type CustomerRequestedChangesDTO = I.TypeOf<typeof CustomerRequestedChangesDTO>

export default resolveEvent
