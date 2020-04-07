// tslint:disable:max-classes-per-file
import { Lens } from "monocle-ts"

import {
  Entity,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
  utils,
} from "@fp-app/framework"
import Event from "@fp-app/framework/src/event"
import {
  Result,
  E,
  pipe,
  trampoline,
  ToolDeps,
  t,
  decodeErrors,
  convertCoolLens,
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
  mapStatic,
  map,
  chain,
  ok,
  success,
  mapLeft,
  Either,
  either,
} from "@fp-app/fp-ts-extensions/src/Either"

export default class TrainTrip extends Entity {
  /** the primary way to create a new TrainTrip */
  static create = (
    trip: TripWithSelectedTravelClass,
    { pax, startDate }: { startDate: FutureDate; pax: PaxDefinition },
    currentDate: Date,
  ) => {
    const travelClassConfiguration = trip.travelClasses.map((x) =>
      unsafeUnwrap(TravelClassConfiguration.create(x)),
    )
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const currentTravelClassConfiguration = travelClassConfiguration.find(
      (x) => x.travelClass.name === trip.currentTravelClass.name,
    )!

    const t = new TrainTrip(
      utils.generateUuid(),
      pax,
      startDate,
      travelClassConfiguration,
      currentTravelClassConfiguration,
      currentDate,
    )
    t.registerDomainEvent(new TrainTripCreated(t.id))

    return t
  }

  readonly opportunityId?: string
  readonly lockedAt?: Date

  /** use TrainTrip.create() instead */
  constructor(
    id: string,
    readonly pax: PaxDefinition,
    readonly startDate: Date,
    readonly travelClassConfiguration: TravelClassConfiguration[] = [],
    readonly currentTravelClassConfiguration: TravelClassConfiguration,
    readonly createdAt: Date,
    rest?: Partial<
      Omit<
        { -readonly [key in keyof TrainTrip]: TrainTrip[key] },
        | "id"
        | "pax"
        | "startDate"
        | "travelClassConfiguration"
        | "currentTravelClassConfiguration"
        | "createdAt"
      >
    >,
    // rest?: Partial<{ -readonly [key in keyof TrainTrip]: TrainTrip[key] }>,
  ) {
    super(id)
    Object.assign(this, rest)
  }

  readonly proposeChanges = captureEventsEither(
    unwrapResultEither(this, proposeChanges),
    this.registerDomainEvent,
  )

  readonly lock = captureEvents(unwrapResult(this, lock), this.registerDomainEvent)

  readonly assignOpportunity = unwrapResult(this, assignOpportunity)

  readonly updateTrip = unwrapResult(this, updateTrip)

  // TODO: This seems like cheating, we're missing another Aggregate Root..
  readonly delete = captureEvents(del(this), this.registerDomainEvent)

  ////////////
  //// Separate sample; not used other than testing
  readonly changeStartDate = captureEventsEither(
    unwrapResultEither(this, changeStartDate),
    this.registerDomainEvent,
  )

  readonly changeTravelClass = captureEventsEither(
    unwrapResultEither(this, changeTravelClass),
    this.registerDomainEvent,
  )

  //private readonly applyDefinedChanges = applyDefinedChanges(this)

  // private readonly intChangeStartDate = unwrapResult(intChangeStartDate(this))

  // //private readonly intChangePax = unwrapResult(intChangePax(this))
  // private readonly intChangeTravelClass = unwrapResultEither(intChangeTravelClass(this))
  // private confirmUserChangeAllowed = confirmUserChangeAllowed(this)

  // private readonly createChangeEvents = (changed: boolean) => {
  //   const events = [...createChangeEvents(this)(changed)]
  //   for (const event of events) {
  //     this.registerDomainEvent(event)
  //   }
  // }
}

// changePax = (pax: PaxDefinition) =>
//   pipe(
//     this.confirmUserChangeAllowed(),
//     mapStatic(pax),
//     map(this.intChangePax),
//     map(this.createChangeEvents),
//   )

export const changeStartDate = <This extends Pick<TrainTrip, "startDate" | "id">>(
  _this: This,
) => (startDate: FutureDate) =>
  pipe(
    confirmUserChangeAllowed(_this)(),
    mapStatic(startDate),
    map(intChangeStartDate(_this)),
    map(([_this, events, changed]) =>
      tuple(_this, events.concat([...createChangeEvents(_this)(changed)])),
    ),
  )

export const changeTravelClass = (_this: TrainTrip) =>
  trampoline(
    (_: ToolDeps<ForbiddenError | InvalidStateError>) => (
      travelClass: TravelClassDefinition,
    ) =>
      pipe(
        confirmUserChangeAllowed(_this)(),
        mapStatic(travelClass),
        chain(pipe(intChangeTravelClass(_this), _.RE.liftErr)),
        map(([_this, events, changed]) =>
          tuple(_this, events.concat([...createChangeEvents(_this)(changed)])),
        ),
      ),
  )
// ALT
// changeTravelClass: Tramp<
//   TravelClassDefinition,
//   void,
//   ForbiddenError | InvalidStateError
// > = trampolineE(_ => travelClass =>
//   pipe(
//     this.confirmUserChangeAllowed(),
//     mapStatic(travelClass),
//     chain(_.E.liftErr(this.intChangeTravelClass)),
//     map(this.createChangeEvents),
//   ),
// )
//// End Separate sample; not used other than testing
////////////

const opportunityIdL = Lens.fromPath<TrainTrip>()(["opportunityId"])
export const assignOpportunity = (_this: TrainTrip) => (opportunityId: string) => {
  _this = opportunityIdL.modify(() => opportunityId)(_this)
  return tuple(_this, void 0 as void)
}

const del = (_this: TrainTrip) => () => {
  return tuple(new TrainTripDeleted(_this.id))
}

const travelClassL = Lens.fromPath<TravelClassConfiguration>()(["travelClass"])
const travelClassConfigurationL = Lens.fromPath<TrainTrip>()([
  "travelClassConfiguration",
])

const currentTravelClassConfigurationL = Lens.fromPath<TrainTrip>()([
  "currentTravelClassConfiguration",
])

const updateTrip = (_this: TrainTrip) => (trip: Trip) => {
  // This will clear all configurations upon trip update
  // TODO: Investigate a resolution mechanism to update existing configurations, depends on business case ;-)
  _this = travelClassConfigurationL.modify(() =>
    trip.travelClasses.map((x) => {
      const existing = _this.travelClassConfiguration.find(
        (y) => y.travelClass.name === x.name,
      )
      return existing
        ? travelClassL.modify(() => x)(existing)
        : unsafeUnwrap(TravelClassConfiguration.create(x))
    }),
  )(_this)
  // unsafeUnwrap(TravelClassConfiguration.create(x)
  // vs:
  // w.travelClassConfiguration = trip.travelClasses.map(x =>
  //   const existing = this.travelClassConfiguration.find(y => y.travelClass.name === x.name)
  //   return { ...existing, travelClass: x }
  // }
  const currentTravelClassConfiguration = _this.travelClassConfiguration.find(
    (x) =>
      _this.currentTravelClassConfiguration.travelClass.name === x.travelClass.name,
  )
  // TODO: use NonEmptyArray?
  _this = currentTravelClassConfigurationL.modify(
    () => currentTravelClassConfiguration || _this.travelClassConfiguration[0],
  )(_this)

  return tuple(_this, void 0)
}

export const proposeChanges = (_this: TrainTrip) =>
  trampoline(
    (_: ToolDeps<ValidationError | InvalidStateError | ForbiddenError>) => (
      state: StateProposition,
    ) =>
      pipe(
        confirmUserChangeAllowed(_this)(),
        mapStatic(state),
        chain(pipe(applyDefinedChanges(_this), _.RE.liftErr)),
        // TODO: push the events out as return
        //E.map(x => [...createChangeEvents(_this)(x)]),
        map(([_this, events, changed]) =>
          tuple(_this, events.concat([...createChangeEvents(_this)(changed)])),
        ),
      ),
    // ALT1
    // pipe(
    //   ok(state),
    //   chainTee(this.confirmUserChangeAllowed),
    //   chain(liftE(this.applyDefinedChanges)),
    //   map(this.createChangeEvents),
    // )
    // ALT2
    // pipe(
    //   this.confirmUserChangeAllowed(),
    //   chain(liftErr(() => this.applyDefinedChanges(state))),
    //   map(this.createChangeEvents),
    // )
  )

// TODO: we have to return the object from each map
// TODO: convert back from Imperative to Functional.
const applyDefinedChanges = (_this: TrainTrip) => ({
  pax,
  startDate,
  travelClass,
}: StateProposition) => {
  let events: Event[] = []
  let changed = false
  if (startDate !== undefined) {
    const r = intChangeStartDate(_this)(startDate)
    _this = r[0]
    events = events.concat(r[1])
    if (r[2]) {
      changed = true
    }
  }
  if (pax !== undefined) {
    const r = intChangePax(_this)(pax)
    _this = r[0]
    events = events.concat(r[1])
    if (r[2]) {
      changed = true
    }
  }
  if (travelClass !== undefined) {
    const rEither = intChangeTravelClass(_this)(travelClass)
    if (E.isErr(rEither)) {
      return rEither
    }
    const r = rEither.right
    _this = r[0]
    events = events.concat(r[1])
    if (r[2]) {
      changed = true
    }
  }
  return ok(tuple(_this, events, changed))
}
const lockedAtL = Lens.fromPath<TrainTrip>()(["lockedAt"])
export const lock = (_this: TrainTrip) => (currentDate: Date) => {
  _this = lockedAtL.modify(() => currentDate)(_this)
  const events: Event[] = [new TrainTripStateChanged(_this.id)]
  return tuple(_this, events)
}

const startDateL = convertCoolLens(
  Lens.fromPath<Pick<TrainTrip, "startDate">>()(["startDate"]),
)
const intChangeStartDate = <This extends Pick<TrainTrip, "startDate" | "id">>(
  _this: This,
) => (startDate: FutureDate) => {
  const events: Event[] = []
  if (startDate.toISOString() === _this.startDate.toISOString()) {
    return tuple(_this, events, false)
  }
  // TODO: return just the boolean, and apply the change at the caller?
  // TODO: other business logic
  _this = startDateL.modify(() => startDate)(_this)
  return tuple(_this, events, true)
}

const paxL = Lens.fromPath<TrainTrip>()(["pax"])
const intChangePax = (_this: TrainTrip) => (pax: PaxDefinition) => {
  const events: Event[] = []
  if (isEqual(_this.pax, pax)) {
    return tuple(_this, events, false)
  }
  _this = paxL.modify(() => pax)(_this)
  // TODO: other business logic
  return tuple(_this, events, true)
}

const intChangeTravelClass = (_this: TrainTrip) => (
  travelClass: TravelClassDefinition,
): Result<[TrainTrip, Event[], boolean], InvalidStateError> => {
  const slc = _this.travelClassConfiguration.find(
    (x) => x.travelClass.name === travelClass,
  )
  if (!slc) {
    return err(new InvalidStateError(`${travelClass} not available currently`))
  }
  const events: Event[] = []
  if (_this.currentTravelClassConfiguration === slc) {
    return ok([_this, events, false])
  }
  _this = currentTravelClassConfigurationL.modify(() => slc)(_this)
  return ok([_this, events, true])
}

const confirmUserChangeAllowed = <This extends Pick<TrainTrip, "lockedAt" | "id">>(
  _this: This,
) => (): Result<void, ForbiddenError> =>
  isLocked(_this)
    ? err(new ForbiddenError(`No longer allowed to change TrainTrip ${_this.id}`))
    : success()

export const isLocked = <This extends Pick<TrainTrip, "lockedAt">>(_this: This) =>
  Boolean(_this.lockedAt)

const createChangeEvents = <This extends Pick<TrainTrip, "id">>(_this: This) =>
  function* (changed: boolean) {
    yield new UserInputReceived(_this.id)
    if (changed) {
      yield new TrainTripStateChanged(_this.id)
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface TravelClassConfiguration extends TravelClassConfigurationType {}

export { TravelClassConfiguration }

/*
These event names look rather technical (like CRUD) and not very domain driven

*/

export class TrainTripCreated extends Event {
  constructor(readonly trainTripId: TrainTripId) {
    super()
  }
}

export class UserInputReceived extends Event {
  constructor(readonly trainTripId: TrainTripId) {
    super()
  }
}

export class TrainTripStateChanged extends Event {
  constructor(readonly trainTripId: TrainTripId) {
    super()
  }
}

export class TrainTripDeleted extends Event {
  constructor(readonly trainTripId: TrainTripId) {
    super()
  }
}

export interface StateProposition {
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

const captureEventsEither = <TE, TEvent extends Event, TArgs extends unknown[]>(
  func: (...args: TArgs) => Either<TE, readonly TEvent[]>,
  registerDomainEvent: (evt: Event) => void,
) => (...args: TArgs) =>
  either.map(func(...args), (evts) => evts.forEach(registerDomainEvent))

const captureEvents = <TEvent extends Event, TArgs extends unknown[]>(
  func: (...args: TArgs) => readonly TEvent[],
  registerDomainEvent: (evt: Event) => void,
) => (...args: TArgs) => func(...args).forEach(registerDomainEvent)

const unwrapResultEither = <This, TE, T, T2, TArgs extends unknown[]>(
  t: This,
  func: (t: This) => (...args: TArgs) => Either<TE, readonly [T, T2]>,
) => (...args: TArgs) =>
  either.map(func(t)(...args), ([newT, r]) => {
    // this unifies the FP and OO world right now
    Object.assign(t, newT)
    return r
  })

const unwrapResult = <This, T, T2, TArgs extends unknown[]>(
  t: This,
  func: (t: This) => (...args: TArgs) => readonly [T, T2],
) => (...args: TArgs) => {
  // this unifies the FP and OO world right now
  const [newT, r] = func(t)(...args)
  Object.assign(t, newT)
  return r
}
