import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { lock } from "../TrainTrip"
import { compose, map, chain } from "@fp-app/fp-ts-extensions/src/TaskEither"
import { trainTrips } from "@/TrainTrip/infrastructure/TrainTripContext.disk"
import { tupled } from "fp-ts/lib/function"

const createCommand = createCommandWithDeps(() => ({
  trainTrips,
  ...defaultDependencies,
}))

const lockTrainTrip = createCommand<Input, void, LockTrainTripError>(
  "lockTrainTrip",
  ({ trainTrips }) =>
    compose(
      map(({ trainTripId }) => trainTripId),
      chain(wrap(trainTrips.load)),
      // Test with Functional approach.
      map(trainTrip => lock(trainTrip)(new Date())),
      map(tupled(trainTrips.processEvents)),
    ),
)

export default lockTrainTrip
export interface Input {
  trainTripId: string
}
type LockTrainTripError = DbError
