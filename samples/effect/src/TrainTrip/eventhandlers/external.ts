import { I, E, IT } from "@fp-app/fp-ts-extensions"
import ChangeTrainTrip from "../usecases/ChangeTrainTrip"
import RegisterCloud from "./RegisterCloud"
import { T } from "@e/framework"

export const RegisterOnCloud = I.type({
  type: I.literal("RegisterOnCloud"),
  trainTripId: IT.NonEmptyString.NonEmptyString,
})
export interface RegisterOnCloud extends I.TypeOf<typeof RegisterOnCloud> {}

export const CustomerRequestedChanges = I.type({
  trainTripId: IT.NonEmptyString.NonEmptyString,
  type: I.literal("CustomerRequestedChanges"),
})

export const SupportedIntegrationEvents = I.union([
  CustomerRequestedChanges,
  RegisterOnCloud,
])

export type SupportedIntegrationEvents = CustomerRequestedChanges | RegisterOnCloud

export interface CustomerRequestedChanges
  extends I.TypeOf<typeof CustomerRequestedChanges> {}

const OnCustomerRequestedChanges = ({ trainTripId }: CustomerRequestedChanges) =>
  ChangeTrainTrip({ trainTripId, locked: true })

export const eventHandlers = {
  CustomerRequestedChanges: OnCustomerRequestedChanges,
  RegisterOnCloud: RegisterCloud,
}

const notImplemented = (evt: SupportedIntegrationEvents) =>
  T.sync(() => {
    console.log(`${evt.type} queue event not implemented`)
  })

export const handlers = <TEvent extends SupportedIntegrationEvents>(evt: TEvent) => {
  const keys = Object.keys(eventHandlers)
  if (keys.includes(evt.type)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return eventHandlers[evt.type as keyof typeof eventHandlers](evt as any)
  } else {
    return notImplemented(evt)
  }
}

export const parseEvent = T.liftEither((unknownEvent: unknown) =>
  E.either.map(
    SupportedIntegrationEvents.decode(unknownEvent),
    (a) => a as SupportedIntegrationEvents,
  ),
)
