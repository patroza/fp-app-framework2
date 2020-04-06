//// Separate endpoint sample; unused.

import {
  createCommandWithDeps,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
  DbError,
} from "@fp-app/framework"
import { pipe, E, Do, TE, toVoid } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import TravelClassDefinition from "../TravelClassDefinition"
import { defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { trainTrips } from "@/TrainTrip/infrastructure/TrainTripContext.disk"

const createCommand = createCommandWithDeps(() => ({
  trainTrips,
  ...defaultDependencies,
}))

export const changeStartDate = createCommand<
  ChangeStartDateInput,
  void,
  ChangeStartDateError
>("changeStartDate", ({ _, trainTrips }) => (input) =>
  Do(TE.taskEither)
    .bind(
      "startDate",
      pipe(input.startDate, pipe(FutureDate.create, _.RE.liftErr, E.toTaskEither)),
    )
    .bind("trainTrip", pipe(input.trainTripId, pipe(wrap(trainTrips.load))))
    .doL(({ startDate, trainTrip }) =>
      pipe(startDate, pipe(trainTrip.changeStartDate, E.toTaskEither)),
    )
    .return(toVoid),
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
>("changeTravelClass", ({ _, trainTrips }) => (input) =>
  Do(TE.taskEither)
    .bind(
      "travelClass",
      pipe(
        input.travelClass,
        pipe(TravelClassDefinition.create, _.RE.liftErr, E.toTaskEither),
      ),
    )
    .bind("trainTrip", pipe(input.trainTripId, wrap(trainTrips.load)))
    .doL(({ trainTrip, travelClass }) =>
      pipe(travelClass, pipe(trainTrip.changeTravelClass, E.toTaskEither)),
    )
    .return(toVoid),
)

export interface ChangeTravelClassInput {
  trainTripId: string
  travelClass: TravelClassDefinition
}
type ChangeTravelClassError =
  | ForbiddenError
  | InvalidStateError
  | ValidationError
  | DbError
