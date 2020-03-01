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
  liftE,
  liftTE,
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
>("changeStartDate", ({ db }) =>
  compose(
    chainTupTask(
      sdLift.TE(({ startDate }) => TE.fromEither(FutureDate.create(startDate))),
    ),
    chainFlatTupTask(sdLift.TE(([, i]) => db.trainTrips.load(i.trainTripId))),
    TE.chain(
      sdLift.TE(([trainTrip, sd]) => TE.fromEither(trainTrip.changeStartDate(sd))),
    ),
  ),
)

const sdLift = {
  E: liftE<ChangeStartDateError>(),
  TE: liftTE<ChangeStartDateError>(),
}

export interface ChangeStartDateInput {
  trainTripId: string
  startDate: string
}
type ChangeStartDateError = ValidationError | ForbiddenError | DbError

export const changeTravelClass = createCommand<
  ChangeTravelClassInput,
  void,
  ChangeTravelClassError
>("changeTravelClass", ({ db }) =>
  compose(
    chainTupTask(
      tcLift.TE(({ travelClass }) =>
        TE.fromEither(TravelClassDefinition.create(travelClass)),
      ),
    ),
    chainFlatTupTask(tcLift.TE(([, i]) => db.trainTrips.load(i.trainTripId))),
    TE.chain(
      tcLift.TE(([trainTrip, sl]) => TE.fromEither(trainTrip.changeTravelClass(sl))),
    ),
  ),
)
const tcLift = {
  E: liftE<ChangeTravelClassError>(),
  TE: liftTE<ChangeTravelClassError>(),
}

export interface ChangeTravelClassInput {
  trainTripId: string
  travelClass: TravelClassName
}
type ChangeTravelClassError =
  | ForbiddenError
  | InvalidStateError
  | ValidationError
  | DbError
