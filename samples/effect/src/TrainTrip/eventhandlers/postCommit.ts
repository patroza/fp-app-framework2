import {
  TrainTripCreated,
  TrainTripStateChanged,
  UserInputReceived,
  Events,
} from "@e/TrainTrip/TrainTrip"
import { T } from "@e/framework"
import * as TTP from "@e/TrainTrip/infrastructure/trainTripPublisher.inMemory"

// Domain Events should primarily be used to be turned into Integration Event (Post-Commit, call other service)
// There may be other small reasons to use it, like to talk to an external system Pre-Commit.
// Otherwise they just add additional layers of indirection and take behavior away often more suited for the Aggregrates/root.
// Informing other bounded contexts, generally should not occur within the same transaction, and should thus be handled
// by turning into Integration Events.

// Ideas: Store Integration Events into the database within the same Commit, and process them in an outside service.
// So that we may ensure the events will be processed.
// Other options can be to have a compensating action running regularly that checks and fixes things. A sort of eventual consistency.

const notImplemented = (evt: Events) =>
  T.sync(() => {
    console.log(`${evt.type} integration event not implemented`)
    return []
  })

export const handlers = <TEvent extends Events>(evt: TEvent) => {
  const keys = Object.keys(eventHandlers)
  if (keys.includes(evt.type)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return eventHandlers[evt.type as keyof typeof eventHandlers](evt as any)
  } else {
    return notImplemented(evt)
  }
}

const OnTrainTripCreated = (evt: TrainTripCreated) => TTP.register(evt.trainTripId)

const OnTrainTripStateChanged = (evt: TrainTripStateChanged) =>
  TTP.register(evt.trainTripId)

const OnUserInputReceived = (evt: UserInputReceived) =>
  TTP.registerIfPending(evt.trainTripId)

const eventHandlers = {
  TrainTripStateChanged: OnTrainTripStateChanged,
  TrainTripCreated: OnTrainTripCreated,
  UserInputReceived: OnUserInputReceived,
}
