import { t, E, Do } from "@fp-app/fp-ts-extensions"
import ChangeTrainTrip from "./usecases/ChangeTrainTrip"
import { T, liftEitherSuspended } from "@e/meffect"
import * as FW from "@fp-app/framework"
import provideRequestScoped from "./provideRequestScoped"

// TODO: RegisterCloud should be added here?

const executeReceived = (unknownEvent: unknown) =>
  T.asUnit(
    Do(T.effect)
      .do(T.sync(() => FW.utils.logger.log("Received integration event", unknownEvent)))
      .bind("event", parseEvent(unknownEvent))
      .doL(({ event }) => provideRequestScoped(handlers(event)))
      .done(),
  )

export default executeReceived

const parseEvent = liftEitherSuspended((unknownEvent: unknown) =>
  E.either.map(SupportedIntegrationEvents.decode(unknownEvent), (a) => a as Events),
)

const SomeOtherEvent = t.type({
  type: t.keyof({ SomeOther: null }),
  payload: t.type({}),
})

export const CustomerRequestedChanges = t.type({
  trainTripId: t.NonEmptyString,
  type: t.literal("CustomerRequestedChanges"),
})

const SupportedIntegrationEvents = t.union([CustomerRequestedChanges, SomeOtherEvent])

export interface CustomerRequestedChanges
  extends t.TypeOf<typeof CustomerRequestedChanges> {}

const OnCustomerRequestedChanges = ({ trainTripId }: CustomerRequestedChanges) =>
  ChangeTrainTrip({ trainTripId, locked: true })

export const eventHandlers = {
  CustomerRequestedChanges: OnCustomerRequestedChanges,
}

type Unsupported = { type: "unsupported" }
type Events = CustomerRequestedChanges | Unsupported

const notImplemented = (evt: Events) =>
  T.sync(() => {
    console.log(`${evt.type} queue event not implemented`)
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
