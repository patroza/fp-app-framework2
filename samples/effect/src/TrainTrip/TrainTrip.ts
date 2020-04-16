// tslint:disable:max-classes-per-file
import { Lens } from "monocle-ts"

import {
  ForbiddenError,
  InvalidStateError,
  ValidationError,
  utils,
} from "@fp-app/framework"
import {
  Result,
  E,
  pipe,
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

const create = (
  trip: TripWithSelectedTravelClass,
  { pax, startDate }: { startDate: FutureDate; pax: PaxDefinition },
  currentDate: Date,
): readonly [TrainTrip, readonly [TrainTripCreated]] => {
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
  const events = [TrainTripCreated.create(t.id)] as const

  return [t, events] as const
}

const changePax = (pax: PaxDefinition) => <This extends Pick<TrainTrip, "pax" | "id">>(
  tt: This,
) =>
  Do(E.either)
    .do(confirmUserChangeAllowed(tt))
    .let("result", pipe(tt, intChangePax(pax)))
    .return(({ result: [tt, events, changed] }) =>
      tuple(tt, [...events, ...createChangeEvents(changed)(tt)]),
    )

const changeStartDate = (startDate: FutureDate) => <
  This extends Pick<TrainTrip, "startDate" | "id">
>(
  tt: This,
) =>
  Do(E.either)
    .do(confirmUserChangeAllowed(tt))
    .let("result", pipe(tt, intChangeStartDate(startDate)))
    .return(({ result: [tt, events, changed] }) =>
      tuple(tt, [...events, ...createChangeEvents(changed)(tt)] as const),
    )

const changeTravelClass = (travelClass: TravelClassDefinition) => (tt: TrainTrip) =>
  Do(E.either)
    .do(
      pipe(
        tt,
        confirmUserChangeAllowed,
        E.liftErr<ForbiddenError | InvalidStateError>(),
      ),
    )
    .bind("result", pipe(tt, intChangeTravelClass(travelClass)))
    .return(({ result: [tt, events, changed] }) =>
      tuple(tt, [...events, ...createChangeEvents(changed)(tt)] as const),
    )

const opportunityIdL = Lens.fromPath<TrainTrip>()(["opportunityId"])
const assignOpportunity = (opportunityId: string) => (tt: TrainTrip) => {
  tt = opportunityIdL.modify(() => opportunityId)(tt)
  return tuple(tt, [] as const)
}

const del = (tt: TrainTrip) => tuple(TrainTripDeleted.create(tt.id))

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

  return tuple(tt, [] as const)
}

const proposeChanges = (state: StateProposition) => (tt: TrainTrip) =>
  Do(E.either)
    .do(
      pipe(
        tt,
        confirmUserChangeAllowed,
        E.liftErr<ValidationError | InvalidStateError | ForbiddenError>(),
      ),
    )
    .bind("result", pipe(tt, applyDefinedChanges(state)))
    .return(({ result: [tt, events, changed] }) =>
      tuple(tt, [...events, ...createChangeEvents(changed)(tt)]),
    )

// TODO: we have to return the object from each map
// TODO: convert back from Imperative to Functional.
const applyDefinedChanges = ({
  locked,
  pax,
  startDate,
  travelClass,
}: StateProposition) => (tt: TrainTrip) => {
  const computeStartdate = () => {
    if (startDate !== undefined) {
      return pipe(tt, intChangeStartDate(startDate))
    }
    return [tt, [], false] as const
  }
  const sd = computeStartdate()
  tt = sd[0]
  const computePax = () => {
    if (pax !== undefined) {
      return pipe(tt, intChangePax(pax))
    }
    return [tt, [], false] as const
  }
  const px = computePax()
  tt = px[0]
  const computeTraveClass = () => {
    if (travelClass !== undefined) {
      return pipe(tt, intChangeTravelClass(travelClass))
    }
    return E.right([tt, [], false] as const)
  }
  const tcE = computeTraveClass()
  if (E.isErr(tcE)) {
    return E.left(tcE.left)
  }
  const tc = tcE.right
  tt = tc[0]

  const computeLocked = () => {
    // TODO: this should be in the lock method instead
    if (tt.lockedAt && !locked) {
      return E.left(new ValidationError("Cannot unlock a locked"))
    }
    if (locked) {
      // TODO: Date should be moved up.
      return E.right(pipe(tt, lock(new Date())))
    }
    return E.right([tt, [], false] as const)
  }
  const lkE = computeLocked()
  if (E.isErr(lkE)) {
    return E.left(lkE.left)
  }
  const lk = lkE.right
  tt = lk[0]

  return ok(
    tuple(
      tt,
      [...sd[1], ...px[1], ...tc[1], ...lk[1]] as const,
      sd[2] || px[2] || tc[2] || lk[2],
    ),
  )
}
const lockedAtL = Lens.fromPath<TrainTrip>()(["lockedAt"])
const lock = (currentDate: Date) => (tt: TrainTrip) => {
  if (tt.lockedAt) {
    return tuple(tt, [], false)
  }
  tt = lockedAtL.modify(() => currentDate)(tt)
  const events = [TrainTripStateChanged.create(tt.id)] as const
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
  if (startDate.toISOString() === tt.startDate.toISOString()) {
    return tuple(tt, noEvents(), false)
  }
  tt = startDateL.modify(() => startDate)(tt)
  return tuple(tt, noEvents(), true)
}

const noEvents = () => [] as const

const paxL = convertCoolLens(Lens.fromPath<Pick<TrainTrip, "pax">>()(["pax"]))
const intChangePax = (pax: PaxDefinition) => <This extends Pick<TrainTrip, "pax">>(
  tt: This,
) => {
  if (isEqual(tt.pax, pax)) {
    return tuple(tt, noEvents(), false)
  }
  tt = paxL.modify(() => pax)(tt)
  return tuple(tt, noEvents(), true)
}

const intChangeTravelClass = (travelClass: TravelClassDefinition) => (
  tt: TrainTrip,
) => {
  const slc = tt.travelClassConfiguration.find(
    (x) => x.travelClass.name === travelClass,
  )
  if (!slc) {
    return err(new InvalidStateError(`${travelClass} not available currently`))
  }
  if (tt.currentTravelClassConfiguration === slc) {
    return ok(tuple(tt, noEvents(), false))
  }
  tt = currentTravelClassConfigurationL.modify(() => slc)(tt)
  return ok(tuple(tt, noEvents(), true))
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
    yield UserInputReceived.create(tt.id)
    if (changed) {
      yield TrainTripStateChanged.create(tt.id)
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

const createEvent = <TO>(t: t.TypeC<any>) => ({
  ...t,
  create: (trainTripId: string) =>
    (({ trainTripId, type: t.props.type.name } as unknown) as TO),
})

const TrainTripCreated_ = t.type({
  trainTripId: t.string,
  type: t.literal("TrainTripCreated"),
})

export const TrainTripCreated = createEvent<TrainTripCreated>(TrainTripCreated_)
export interface TrainTripCreated extends t.TypeOf<typeof TrainTripCreated_> {}

const UserInputReceived_ = t.type({
  trainTripId: t.string,
  type: t.literal("UserInputReceived"),
})
export const UserInputReceived = createEvent<UserInputReceived>(UserInputReceived_)
export interface UserInputReceived extends t.TypeOf<typeof UserInputReceived_> {}

const TrainTripStateChanged_ = t.type({
  trainTripId: t.string,
  type: t.literal("TrainTripStateChanged"),
})
export const TrainTripStateChanged = createEvent<TrainTripStateChanged>(
  UserInputReceived_,
)
export interface TrainTripStateChanged
  extends t.TypeOf<typeof TrainTripStateChanged_> {}

const TrainTripDeleted_ = t.type({
  trainTripId: t.string,
  type: t.literal("TrainTripDeleted"),
})
export const TrainTripDeleted = createEvent<TrainTripDeleted>(TrainTripDeleted_)
export interface TrainTripDeleted extends t.TypeOf<typeof TrainTripDeleted_> {}

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
