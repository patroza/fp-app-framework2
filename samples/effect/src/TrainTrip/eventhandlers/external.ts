import { t, E } from "@fp-app/fp-ts-extensions"
import ChangeTrainTrip from "../usecases/ChangeTrainTrip"
import RegisterCloud from "./RegisterCloud"
import { T, liftEitherSuspended } from "@e/meffect"

export const RegisterOnCloud = t.type({
  type: t.literal("RegisterOnCloud"),
  trainTripId: t.NonEmptyString,
})
export interface RegisterOnCloud extends t.TypeOf<typeof RegisterOnCloud> {}

export const CustomerRequestedChanges = t.type({
  trainTripId: t.NonEmptyString,
  type: t.literal("CustomerRequestedChanges"),
})

export const SupportedIntegrationEvents = t.union([
  CustomerRequestedChanges,
  RegisterOnCloud,
])

export type SupportedIntegrationEvents = CustomerRequestedChanges | RegisterOnCloud

export interface CustomerRequestedChanges
  extends t.TypeOf<typeof CustomerRequestedChanges> {}

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

export const parseEvent = liftEitherSuspended((unknownEvent: unknown) =>
  E.either.map(
    SupportedIntegrationEvents.decode(unknownEvent),
    (a) => a as SupportedIntegrationEvents,
  ),
)
