//// Separate endpoint sample; unused.

import {
  createCommandWithDeps,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
  DbError,
} from "@fp-app/framework"
import { TE, chainTupTask, chainFlatTupTask, compose } from "@fp-app/fp-ts-extensions"
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
      tools.liftTE(({ startDate }) => TE.fromEither(FutureDate.create(startDate))),
    ),
    chainFlatTupTask(tools.liftTE(([, i]) => db.trainTrips.load(i.trainTripId))),
    TE.chain(
      tools.liftTE(([trainTrip, sd]) => TE.fromEither(trainTrip.changeStartDate(sd))),
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
      tools.liftTE(({ travelClass }) =>
        TE.fromEither(TravelClassDefinition.create(travelClass)),
      ),
    ),
    chainFlatTupTask(tools.liftTE(([, i]) => db.trainTrips.load(i.trainTripId))),
    TE.chain(
      tools.liftTE(([trainTrip, sl]) => TE.fromEither(trainTrip.changeTravelClass(sl))),
    ),
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
