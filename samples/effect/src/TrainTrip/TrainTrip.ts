// tslint:disable:max-classes-per-file
import { Lens } from "monocle-ts"

import {
  ForbiddenError,
  InvalidStateError,
  ValidationError,
  utils,
} from "@fp-app/framework"
import { Event } from "@fp-app/framework-classic"
import {
  Result,
  E,
  pipe,
  trampoline,
  ToolDeps,
  t,
  decodeErrors,
  convertCoolLens,
  Do,
} from "@fp-app/fp-ts-extensions"
import isEqual from "lodash/fp/isEqual"
import FutureDate from "./FutureDate"
import PaxDefinition from "./PaxDefinition"
import TravelClassDefinition from "./TravelClassDefinition"
import Trip, { TravelClass, TripWithSelectedTravelClass } from "./Trip"
import { merge } from "lodash"
import { flow, tuple } from "fp-ts/lib/function"
import {
  err,
  unsafeUnwrap,
  ok,
  success,
  mapLeft,
} from "@fp-app/fp-ts-extensions/src/Either"

interface TrainTrip {
  readonly opportunityId?: string
  readonly lockedAt?: Date

  readonly id: string
  readonly pax: PaxDefinition
  readonly startDate: Date
  readonly travelClassConfiguration: TravelClassConfiguration[]
  readonly currentTravelClassConfiguration: TravelClassConfiguration
  readonly createdAt: Date
}

const changePax = (pax: PaxDefinition) => <This extends Pick<TrainTrip, "pax" | "id">>(
  tt: This,
) =>
  Do(E.either)
    .do(confirmUserChangeAllowed(tt))
    .let("result", intChangePax(pax)(tt))
    .return(({ result: [tt, events, changed] }) =>
      tuple(tt, events.concat([...createChangeEvents(changed)(tt)])),
    )

const changeStartDate = (startDate: FutureDate) => <
  This extends Pick<TrainTrip, "startDate" | "id">
>(
  tt: This,
) =>
  Do(E.either)
    .do(confirmUserChangeAllowed(tt))
    .let("result", intChangeStartDate(startDate)(tt))
    .return(({ result: [tt, events, changed] }) =>
      tuple(tt, events.concat([...createChangeEvents(changed)(tt)])),
    )

const changeTravelClass = (travelClass: TravelClassDefinition) =>
  trampoline((_: ToolDeps<ForbiddenError | InvalidStateError>) => (tt: TrainTrip) =>
    Do(E.either)
      .do(pipe(confirmUserChangeAllowed(tt), _.E.liftErr))
      .bind("result", intChangeTravelClass(travelClass)(tt))
      .return(({ result: [tt, events, changed] }) =>
        tuple(tt, events.concat([...createChangeEvents(changed)(tt)])),
      ),
  )

const opportunityIdL = Lens.fromPath<TrainTrip>()(["opportunityId"])
const assignOpportunity = (opportunityId: string) => (tt: TrainTrip) => {
  tt = opportunityIdL.modify(() => opportunityId)(tt)
  return tuple(tt, [] as Event[])
}

const del = (tt: TrainTrip) => tuple(new TrainTripDeleted(tt.id))

const travelClassL = Lens.fromPath<TravelClassConfiguration>()(["travelClass"])
const travelClassConfigurationL = Lens.fromPath<TrainTrip>()([
  "travelClassConfiguration",
])

const currentTravelClassConfigurationL = Lens.fromPath<TrainTrip>()([
  "currentTravelClassConfiguration",
])

const updateTrip = (trip: Trip) => (tt: TrainTrip) => {
  // This will clear all configurations upon trip update
  // TODO: Investigate a resolution mechanism to update existing configurations, depends on business case ;-)
  tt = travelClassConfigurationL.modify(() =>
    trip.travelClasses.map((x) => {
      const existing = tt.travelClassConfiguration.find(
        (y) => y.travelClass.name === x.name,
      )
      return existing
        ? travelClassL.modify(() => x)(existing)
        : unsafeUnwrap(TravelClassConfiguration.create(x))
    }),
  )(tt)
  // unsafeUnwrap(TravelClassConfiguration.create(x)
  // vs:
  // w.travelClassConfiguration = trip.travelClasses.map(x =>
  //   const existing = this.travelClassConfiguration.find(y => y.travelClass.name === x.name)
  //   return { ...existing, travelClass: x }
  // }
  const currentTravelClassConfiguration = tt.travelClassConfiguration.find(
    (x) => tt.currentTravelClassConfiguration.travelClass.name === x.travelClass.name,
  )
  // TODO: use NonEmptyArray?
  tt = currentTravelClassConfigurationL.modify(
    () => currentTravelClassConfiguration || tt.travelClassConfiguration[0],
  )(tt)

  return tuple(tt, [] as Event[])
}

const proposeChanges = (state: StateProposition) =>
  trampoline(
    (_: ToolDeps<ValidationError | InvalidStateError | ForbiddenError>) => (
      tt: TrainTrip,
    ) =>
      Do(E.either)
        .do(pipe(confirmUserChangeAllowed(tt), _.E.liftErr))
        .bind("result", applyDefinedChanges(state)(tt))
        // TODO: push the events out as return
        //E.map(x => [...createChangeEvents(tt)(x)]),
        .return(({ result: [tt, events, changed] }) =>
          tuple(tt, events.concat([...createChangeEvents(changed)(tt)])),
        ),
  )

// TODO: we have to return the object from each map
// TODO: convert back from Imperative to Functional.
const applyDefinedChanges = ({
  locked,
  pax,
  startDate,
  travelClass,
}: StateProposition) => (
  tt: TrainTrip,
): E.Either<InvalidStateError | ValidationError, [TrainTrip, Event[], boolean]> => {
  // TODO: use do?
  let events: Event[] = []
  let changed = false
  if (startDate !== undefined) {
    const r = pipe(tt, intChangeStartDate(startDate))
    tt = r[0]
    events = events.concat(r[1])
    if (r[2]) {
      changed = true
    }
  }
  if (pax !== undefined) {
    const r = pipe(tt, intChangePax(pax))
    tt = r[0]
    events = events.concat(r[1])
    if (r[2]) {
      changed = true
    }
  }
  if (travelClass !== undefined) {
    const rEither = pipe(tt, intChangeTravelClass(travelClass))
    if (E.isErr(rEither)) {
      return rEither
    }
    const r = rEither.right
    tt = r[0]
    events = events.concat(r[1])
    if (r[2]) {
      changed = true
    }
  }
  if (locked !== undefined) {
    if (tt.lockedAt && !locked) {
      return E.left(new ValidationError("Cannot unlock a locked"))
    }
    if (locked) {
      // TODO: Date should be moved up.
      const r = pipe(tt, lock(new Date()))
      tt = r[0]
      events = events.concat(r[1])
      if (r[2]) {
        changed = true
      }
    }
  }
  return ok(tuple(tt, events, changed))
}
const lockedAtL = Lens.fromPath<TrainTrip>()(["lockedAt"])
const lock = (currentDate: Date) => (tt: TrainTrip) => {
  if (tt.lockedAt) {
    return tuple(tt, [], false)
  }
  tt = lockedAtL.modify(() => currentDate)(tt)
  const events: Event[] = [new TrainTripStateChanged(tt.id)]
  return tuple(tt, events, true)
}

const startDateL = convertCoolLens(
  Lens.fromPath<Pick<TrainTrip, "startDate">>()(["startDate"]),
)
const intChangeStartDate = (startDate: FutureDate) => <
  This extends Pick<TrainTrip, "startDate">
>(
  tt: This,
) => {
  const events: Event[] = []
  if (startDate.toISOString() === tt.startDate.toISOString()) {
    return tuple(tt, events, false)
  }
  // TODO: return just the boolean, and apply the change at the caller?
  // TODO: other business logic
  tt = startDateL.modify(() => startDate)(tt)
  return tuple(tt, events, true)
}

const paxL = convertCoolLens(Lens.fromPath<Pick<TrainTrip, "pax">>()(["pax"]))
const intChangePax = (pax: PaxDefinition) => <This extends Pick<TrainTrip, "pax">>(
  tt: This,
) => {
  const events: Event[] = []
  if (isEqual(tt.pax, pax)) {
    return tuple(tt, events, false)
  }
  tt = paxL.modify(() => pax)(tt)
  // TODO: other business logic
  return tuple(tt, events, true)
}

const intChangeTravelClass = (travelClass: TravelClassDefinition) => (
  tt: TrainTrip,
): Result<[TrainTrip, Event[], boolean], InvalidStateError> => {
  const slc = tt.travelClassConfiguration.find(
    (x) => x.travelClass.name === travelClass,
  )
  if (!slc) {
    return err(new InvalidStateError(`${travelClass} not available currently`))
  }
  const events: Event[] = []
  if (tt.currentTravelClassConfiguration === slc) {
    return ok([tt, events, false])
  }
  tt = currentTravelClassConfigurationL.modify(() => slc)(tt)
  return ok([tt, events, true])
}

const create = (
  trip: TripWithSelectedTravelClass,
  { pax, startDate }: { startDate: FutureDate; pax: PaxDefinition },
  currentDate: Date,
): readonly [TrainTrip, readonly Event[]] => {
  const travelClassConfiguration = trip.travelClasses.map((x) =>
    unsafeUnwrap(TravelClassConfiguration.create(x)),
  )
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const currentTravelClassConfiguration = travelClassConfiguration.find(
    (x) => x.travelClass.name === trip.currentTravelClass.name,
  )!

  const t: TrainTrip = {
    id: utils.generateUuid(),
    pax,
    startDate,
    travelClassConfiguration,
    currentTravelClassConfiguration,
    createdAt: currentDate,
  }
  const events = [new TrainTripCreated(t.id)] as const

  return [t, events] as const
}

const confirmUserChangeAllowed = <This extends Pick<TrainTrip, "lockedAt" | "id">>(
  tt: This,
): Result<void, ForbiddenError> =>
  isLocked(tt)
    ? err(new ForbiddenError(`No longer allowed to change TrainTrip ${tt.id}`))
    : success()

const isLocked = <This extends Pick<TrainTrip, "lockedAt">>(tt: This) =>
  Boolean(tt.lockedAt)

const TrainTrip = {
  create,
  isLocked,
  changeStartDate,
  changePax,
  changeTravelClass,
  proposeChanges,
  assignOpportunity,
  del,
  updateTrip,
}

export default TrainTrip

const createChangeEvents = (changed: boolean) =>
  function* <This extends Pick<TrainTrip, "id">>(tt: This) {
    yield new UserInputReceived(tt.id)
    if (changed) {
      yield new TrainTripStateChanged(tt.id)
    }
  }

const Options = t.readonly(
  t.type({
    option1: t.boolean,
    option2: t.number,
  }),
)

const B = t.readonly(
  t.partial({
    priceLastUpdated: t.date,
    options: Options,
  }),
)

const Price2 = t.readonly(
  t.type({
    amount: t.number,
    currency: t.NonEmptyString,
  }),
)

const A = t.readonly(
  t.type({
    price: Price2,
    travelClass: TravelClass,
  }),
)

const _TravelClassConfiguration = t.intersection([A, B])
const createTravelClassConfiguration = (travelClass: TravelClass) => {
  return _TravelClassConfiguration.decode({
    travelClass,
    price: { amount: 1000, currency: "EUR" },
  })
}
const TravelClassConfiguration = merge(_TravelClassConfiguration, {
  create: flow(
    createTravelClassConfiguration,
    mapLeft((x) => new ValidationError(decodeErrors(x))),
  ),
})
type TravelClassConfigurationType = t.TypeOf<typeof TravelClassConfiguration>

interface TravelClassConfiguration extends TravelClassConfigurationType {}

export { TravelClassConfiguration }

/*
These event names look rather technical (like CRUD) and not very domain driven

*/

export type Events =
  | TrainTripCreated
  | TrainTripStateChanged
  | TrainTripDeleted
  | UserInputReceived

export class TrainTripCreated extends Event {
  readonly type = "TrainTripCreated"
  constructor(readonly trainTripId: TrainTripId) {
    super()
  }
}

export class UserInputReceived extends Event {
  readonly type = "UserInputReceived"
  constructor(readonly trainTripId: TrainTripId) {
    super()
  }
}

export class TrainTripStateChanged extends Event {
  readonly type = "TrainTripStateChanged"
  constructor(readonly trainTripId: TrainTripId) {
    super()
  }
}

export class TrainTripDeleted extends Event {
  readonly type = "TrainTripDeleted"
  constructor(readonly trainTripId: TrainTripId) {
    super()
  }
}

export interface StateProposition {
  locked?: boolean
  pax?: PaxDefinition
  startDate?: FutureDate
  travelClass?: TravelClassDefinition
}

export interface CreateTrainTripInfo {
  pax: PaxDefinition
  startDate: FutureDate
  templateId: string
}

export type ID = string
export type TrainTripId = ID
export type TemplateId = ID

export interface Price {
  amount: number
  currency: string
}
