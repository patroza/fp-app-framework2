//// Separate endpoint sample; unused.

import {
  createCommandWithDeps,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
  DbError,
} from "@fp-app/framework"
import {
  TE,
  chainTupTask,
  chainFlatTupTask,
  compose,
  pipe,
  toTE,
} from "@fp-app/fp-ts-extensions"
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
>("changeStartDate", ({ db, tools }) =>
  compose(
    chainTupTask(
      compose(
        TE.map(i => i.startDate),
        TE.chain(pipe(FutureDate.create, tools.liftE, toTE)),
      ),
      // ALT
      // pipe(
      //   FutureDate.create,
      //   tools.liftE,
      //   toTE,
      //   mapper(i => i.startDate),
      // ),
    ),
    chainFlatTupTask(
      compose(
        TE.map(([, i]) => i.trainTripId),
        TE.chain(pipe(db.trainTrips.load, tools.liftTE)),
      ),
      // ALT
      // pipe(
      //   db.trainTrips.load,
      //   tools.liftTE,
      //   mapper(([, i]) => i.trainTripId),
      // ),
    ),
    TE.chain(
      ([trainTrip, startDate]) =>
        pipe(trainTrip.changeStartDate, tools.liftE, toTE, f => f(startDate)),
      // ALT
      // pipe(trainTrip.changeStartDate, tools.liftE, toTE)(startDate),
    ),
  ),
)

export interface ChangeStartDateInput {
  trainTripId: string
  startDate: string
}
type ChangeStartDateError = ValidationError | ForbiddenError | DbError

export const changeTravelClass = createCommand<
  ChangeTravelClassInput,
  void,
  ChangeTravelClassError
>("changeTravelClass", ({ db, tools }) =>
  compose(
    chainTupTask(
      compose(
        TE.map(({ travelClass }) => travelClass),
        TE.chain(toTE(tools.liftE(TravelClassDefinition.create))),
      ),
    ),
    // chainTupTask(({ travelClass }) =>
    //   toTE(tools.liftE(TravelClassDefinition.create))(travelClass),
    // ),
    chainFlatTupTask(
      compose(
        TE.map(([, i]) => i.trainTripId),
        TE.chain(tools.liftTE(db.trainTrips.load)),
      ),
    ),
    // I want to write this as: map([, i] => i.trainTripid), chain(db.trainTrips.load§)
    // chainFlatTupTask(tools.liftTE(([, i]) => db.trainTrips.load(i.trainTripId))),
    // This means:
    // TE.chain(input => {
    //   const load = tools.liftTE(db.trainTrips.load)
    //   const f = ([, i]: typeof input) => load(i.trainTripId)
    //   return pipe(
    //     f(input),
    //     TE.map(x => [x, input[0], input[1]] as const),
    //   )
    // }),
    TE.chain(([trainTrip, sl]) => {
      const changeTravelClass = pipe(trainTrip.changeTravelClass, tools.liftE, toTE)
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
