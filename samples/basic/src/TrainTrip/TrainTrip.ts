// tslint:disable:max-classes-per-file
import { Lens } from "monocle-ts"

import {
  Entity,
  ForbiddenError,
  generateUuid,
  InvalidStateError,
  ValidationError,
  Writeable,
} from "@fp-app/framework"
import Event from "@fp-app/framework/src/event"
import {
  applyIfNotUndefined,
  Result,
  E,
  pipe,
  trampoline,
  ToolDeps,
  t,
  decodeErrors,
} from "@fp-app/fp-ts-extensions"
import isEqual from "lodash/fp/isEqual"
import FutureDate from "./FutureDate"
import PaxDefinition from "./PaxDefinition"
import TravelClassDefinition from "./TravelClassDefinition"
import Trip, { TravelClass, TripWithSelectedTravelClass } from "./Trip"
import { merge } from "lodash"
import { flow } from "fp-ts/lib/function"

export default class TrainTrip extends Entity {
  /** the primary way to create a new TrainTrip */
  static create = (
    { pax, startDate }: { startDate: FutureDate; pax: PaxDefinition },
    trip: TripWithSelectedTravelClass,
  ) => {
    const travelClassConfiguration = trip.travelClasses.map(x =>
      E.unsafeUnwrap(TravelClassConfiguration.create(x)),
    )
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const currentTravelClassConfiguration = travelClassConfiguration.find(
      x => x.travelClass.name === trip.currentTravelClass.name,
    )!

    const t = new TrainTrip(
      generateUuid(),
      pax,
      startDate,
      travelClassConfiguration,
      currentTravelClassConfiguration,
    )
    // TODO: Consider the creation of a train trip to have another starting point,
    // like currentUser.createTrainTrip(), where the domain event then naturally
    // occurs inside the currentUser instead :/
    t.registerDomainEvent(new TrainTripCreated(t.id))

    return t
  }

  readonly createdAt = new Date()
  readonly opportunityId?: string
  readonly lockedAt?: Date
  get isLocked() {
    return Boolean(this.lockedAt)
  }

  /** use TrainTrip.create() instead */
  constructor(
    id: string,
    readonly pax: PaxDefinition,
    readonly startDate: Date,
    readonly travelClassConfiguration: TravelClassConfiguration[] = [],
    readonly currentTravelClassConfiguration: TravelClassConfiguration,
    rest?: Partial<
      Omit<
        { -readonly [key in keyof TrainTrip]: TrainTrip[key] },
        | "id"
        | "pax"
        | "startDate"
        | "travelClassConfiguration"
        | "currentTravelClassConfiguration"
        | "trip"
      >
    >,
    // rest?: Partial<{ -readonly [key in keyof TrainTrip]: TrainTrip[key] }>,
  ) {
    super(id)
    Object.assign(this, rest)
  }

  proposeChanges = proposeChanges(this)

  lock() {
    this.w.lockedAt = new Date()

    this.registerDomainEvent(new TrainTripStateChanged(this.id))
  }

  assignOpportunity(opportunityId: string) {
    this.w.opportunityId = opportunityId
  }

  readonly updateTrip = (trip: Trip) => {
    const travelClass = Lens.fromPath<TravelClassConfiguration>()(["travelClass"])

    // This will clear all configurations upon trip update
    // TODO: Investigate a resolution mechanism to update existing configurations, depends on business case ;-)
    // TODO: Here we could use optics for testing?
    this.w.travelClassConfiguration = trip.travelClasses.map(x => {
      const existing = this.travelClassConfiguration.find(
        y => y.travelClass.name === x.name,
      )
      return existing
        ? travelClass.modify(() => x)(existing)
        : E.unsafeUnwrap(TravelClassConfiguration.create(x))
    })
    // E.unsafeUnwrap(TravelClassConfiguration.create(x)
    // vs:
    // this.w.travelClassConfiguration = trip.travelClasses.map(x =>
    //   const existing = this.travelClassConfiguration.find(y => y.travelClass.name === x.name)
    //   return { ...existing, travelClass: x }
    // }
    const currentTravelClassConfiguration = this.travelClassConfiguration.find(
      x => this.currentTravelClassConfiguration.travelClass.name === x.travelClass.name,
    )
    this.w.currentTravelClassConfiguration =
      currentTravelClassConfiguration || this.travelClassConfiguration[0]!
  }

  // TODO: This seems like cheating, we're missing another Aggregate Root..
  readonly delete = () => {
    this.registerDomainEvent(new TrainTripDeleted(this.id))
  }

  ////////////
  //// Separate sample; not used other than testing
  changeStartDate = (startDate: FutureDate) =>
    pipe(
      this.confirmUserChangeAllowed(),
      E.mapStatic(startDate),
      E.map(this.intChangeStartDate),
      E.map(this.createChangeEvents),
    )

  changePax = (pax: PaxDefinition) =>
    pipe(
      this.confirmUserChangeAllowed(),
      E.mapStatic(pax),
      E.map(this.intChangePax),
      E.map(this.createChangeEvents),
    )

  changeTravelClass = trampoline(
    (_: ToolDeps<ForbiddenError | InvalidStateError>) => (
      travelClass: TravelClassDefinition,
    ) =>
      pipe(
        this.confirmUserChangeAllowed(),
        E.mapStatic(travelClass),
        E.chain(pipe(this.intChangeTravelClass, _.RE.liftErr)),
        E.map(this.createChangeEvents),
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
  //     E.mapStatic(travelClass),
  //     E.chain(_.E.liftErr(this.intChangeTravelClass)),
  //     E.map(this.createChangeEvents),
  //   ),
  // )
  //// End Separate sample; not used other than testing
  ////////////

  private readonly applyDefinedChanges = applyDefinedChanges(this)

  private readonly intChangeStartDate = unwrapResult(intChangeStartDate(this))

  private readonly intChangePax = unwrapResult(intChangePax(this))
  private readonly intChangeTravelClass = unwrapResultEither(intChangeTravelClass(this))
  private confirmUserChangeAllowed = confirmUserChangeAllowed(this)

  private readonly createChangeEvents = (changed: boolean) => {
    const events = [...createChangeEvents(this)(changed)]
    for (const event of events) {
      this.registerDomainEvent(event)
    }
    return events
  }
}

export const proposeChanges = (_this: TrainTrip) =>
  trampoline(
    (_: ToolDeps<ValidationError | InvalidStateError | ForbiddenError>) => (
      state: StateProposition,
    ) =>
      pipe(
        confirmUserChangeAllowed(_this)(),
        E.mapStatic(state),
        E.chain(pipe(applyDefinedChanges(_this), _.RE.liftErr)),
        // TODO: push the events out as return
        //E.map(x => [...createChangeEvents(_this)(x)]),
        E.map(x => [..._this.createChangeEvents(x)]),
      ),
    // ALT1
    // pipe(
    //   E.ok(state),
    //   E.chainTee(this.confirmUserChangeAllowed),
    //   E.chain(liftE(this.applyDefinedChanges)),
    //   E.map(this.createChangeEvents),
    // )
    // ALT2
    // pipe(
    //   this.confirmUserChangeAllowed(),
    //   E.chain(liftErr(() => this.applyDefinedChanges(state))),
    //   E.map(this.createChangeEvents),
    // )
  )

// TODO: we have to return the object from each map
const applyDefinedChanges = (_this: TrainTrip) => ({
  pax,
  startDate,
  travelClass,
}: StateProposition) =>
  E.anyTrue<ValidationError | InvalidStateError>(
    E.map(() => applyIfNotUndefined(startDate, intChangeStartDate(_this))),
    E.map(() => applyIfNotUndefined(pax, intChangePax(_this))),
    E.chain(() => E.valueOrUndefined(travelClass, intChangeTravelClass(_this))),
  )

const intChangeStartDate = (_this: TrainTrip) => (startDate: FutureDate) => {
  if (startDate.toISOString() === _this.startDate.toISOString()) {
    return [_this, false] as const
  }

  ;(_this as Writeable<TrainTrip>).startDate = startDate
  // TODO: other business logic

  return [_this, true] as const
}

const intChangePax = (_this: TrainTrip) => (pax: PaxDefinition) => {
  if (isEqual(_this.pax, pax)) {
    return [_this, false] as const
  }

  ;(_this as Writeable<TrainTrip>).pax = pax
  // TODO: other business logic

  return [_this, true] as const
}

const intChangeTravelClass = (_this: TrainTrip) => (
  travelClass: TravelClassDefinition,
): Result<readonly [TrainTrip, boolean], InvalidStateError> => {
  const slc = _this.travelClassConfiguration.find(
    x => x.travelClass.name === travelClass,
  )
  if (!slc) {
    return E.err(new InvalidStateError(`${travelClass} not available currently`))
  }
  if (_this.currentTravelClassConfiguration === slc) {
    return E.ok([_this, false])
  }
  ;(_this as Writeable<TrainTrip>).currentTravelClassConfiguration = slc
  return E.ok([_this, true])
}

const unwrapResultEither = <TE, T, T2, TArgs extends any[]>(
  func: (...args: TArgs) => E.Either<TE, readonly [T, T2]>,
) => (...args: TArgs) => E.either.map(func(...args), ([_, r]) => r)

const unwrapResult = <TT, T2, TArgs extends any[]>(
  func: (...args: TArgs) => readonly [T, T2],
) => (...args: TArgs) => {
  const [_, r] = func(...args)
  return r
}

const confirmUserChangeAllowed = (_this: TrainTrip) => (): Result<
  void,
  ForbiddenError
> =>
  _this.isLocked
    ? E.err(new ForbiddenError(`No longer allowed to change TrainTrip ${_this.id}`))
    : E.success()

const createChangeEvents = (_this: TrainTrip) =>
  function*(changed: boolean) {
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
    E.mapLeft(x => new ValidationError(decodeErrors(x))),
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
