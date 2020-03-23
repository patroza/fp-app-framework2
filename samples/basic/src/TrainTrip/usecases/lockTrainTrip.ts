import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { DbContextKey, defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { lock } from "../TrainTrip"
import { compose, map, chain } from "@fp-app/fp-ts-extensions/src/TaskEither"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  ...defaultDependencies,
})

const lockTrainTrip = createCommand<Input, void, LockTrainTripError>(
  "lockTrainTrip",
  ({ db }) =>
    compose(
      map(({ trainTripId }) => trainTripId),
      chain(wrap(db.trainTrips.load)),
      // Test with Functional approach.
      map(trainTrip => lock(trainTrip)(new Date())),
      map(([a, b]) => db.trainTrips.process(a, b)),
    ),
)

export default lockTrainTrip
export interface Input {
  trainTripId: string
}
type LockTrainTripError = DbError
