//// Separate endpoint sample; unused.

import {
  createCommandWithDeps,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
  DbError,
} from "@fp-app/framework"
import { TE, pipe, E } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import TravelClassDefinition, { TravelClassName } from "../TravelClassDefinition"
import { DbContextKey, defaultDependencies } from "./types"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  ...defaultDependencies,
})

export const changeStartDate = createCommand<
  ChangeStartDateInput,
  void,
  ChangeStartDateError
>("changeStartDate", ({ _, db }) =>
  TE.compose(
    TE.chainTup(
      TE.compose(
        TE.map(i => i.startDate),
        TE.chain(pipe(FutureDate.create, _.E.liftErr, E.toTaskEither)),
      ),
      // ALT
      // pipe(
      //   FutureDate.create,
      //   _.E.liftErr,
      //   toTE,
      //   mapper(i => i.startDate),
      // ),
    ),
    TE.chainFlatTup(
      TE.compose(
        TE.map(([, i]) => i.trainTripId),
        TE.chain(pipe(db.trainTrips.load, _.TE.liftErr)),
      ),
      // ALT
      // pipe(
      //   db.trainTrips.load,
      //   _.TE.liftErr,
      //   mapper(([, i]) => i.trainTripId),
      // ),
    ),
    TE.chain(
      ([trainTrip, startDate]) =>
        pipe(trainTrip.changeStartDate, _.E.liftErr, E.toTaskEither, f => f(startDate)),
      // ALT
      // pipe(trainTrip.changeStartDate, _.E.liftErr, toTE)(startDate),
    ),
  ),
)

export interface ChangeStartDateInput {
  trainTripId: string
  startDate: Date
}
type ChangeStartDateError = ValidationError | ForbiddenError | DbError

export const changeTravelClass = createCommand<
  ChangeTravelClassInput,
  void,
  ChangeTravelClassError
>("changeTravelClass", ({ _, db }) =>
  TE.compose(
    TE.chainTup(
      TE.compose(
        TE.map(({ travelClass }) => travelClass),
        TE.chain(pipe(TravelClassDefinition.create, _.E.liftErr, E.toTaskEither)),
      ),
    ),
    // alt:
    // TE.chainTup(({ travelClass }) =>
    //   pipe(TravelClassDefinition.create, _.E.liftErr, E.toTaskEither)(travelClass),
    // ),
    // alt2:
    // TE.chainTup(({ travelClass }) => {
    //   const createTravelClassDefinition = pipe(TravelClassDefinition.create, _.E.liftErr, E.toTaskEither)
    //   return createTravelClassDefinition(travelClass),
    // }),
    TE.chainFlatTup(
      TE.compose(
        TE.map(([, i]) => i.trainTripId),
        TE.chain(pipe(db.trainTrips.load, _.TE.liftErr)),
      ),
    ),
    // I want to write this as: map([, i] => i.trainTripid), chain(db.trainTrips.load§)
    // TE.chainFlatTup(_.TE.liftErr(([, i]) => db.trainTrips.load(i.trainTripId))),
    // This means:
    // TE.chain(input => {
    //   const load = _.TE.liftErr(db.trainTrips.load)
    //   const f = ([, i]: typeof input) => load(i.trainTripId)
    //   return pipe(
    //     f(input),
    //     TE.map(x => [x, input[0], input[1]] as const),
    //   )
    // }),
    TE.chain(([trainTrip, sl]) => {
      const changeTravelClass = pipe(
        trainTrip.changeTravelClass,
        _.E.liftErr,
        E.toTaskEither,
      )
      return changeTravelClass(sl)
    }),
  ),
)

export interface ChangeTravelClassInput {
  trainTripId: string
  travelClass: TravelClassName
}
type ChangeTravelClassError =
  | ForbiddenError
  | InvalidStateError
  | ValidationError
  | DbError
