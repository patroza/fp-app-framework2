//// Separate endpoint sample; unused.

import {
  ForbiddenError,
  InvalidStateError,
  ValidationError,
  DbError,
} from "@fp-app/framework"
import { createCommandWithDeps } from "@fp-app/framework-classic"
import { pipe, E, TE, toVoid, RE } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import TravelClassDefinition from "../TravelClassDefinition"
import { defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { trainTrips } from "@c/TrainTrip/infrastructure/TrainTripContext.disk"

const createCommand = createCommandWithDeps(() => ({
  trainTrips,
  ...defaultDependencies,
}))

export const changeStartDate = createCommand<
  ChangeStartDateInput,
  void,
  ChangeStartDateError
>("changeStartDate", ({ trainTrips }) => (input) =>
  TE.Do()
    .bind(
      "startDate",
      pipe(
        input.startDate,
        pipe(FutureDate.create, RE.liftErr<ChangeStartDateError>(), E.toTaskEither),
      ),
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
>("changeTravelClass", ({ trainTrips }) => (input) =>
  TE.Do()
    .bind(
      "travelClass",
      pipe(
        input.travelClass,
        pipe(
          TravelClassDefinition.create,
          RE.liftErr<ChangeTravelClassError>(),
          E.toTaskEither,
        ),
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
