import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { TE } from "@fp-app/fp-ts-extensions"
import { DbContextKey, defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  ...defaultDependencies,
})

const lockTrainTrip = createCommand<Input, void, LockTrainTripError>(
  "lockTrainTrip",
  ({ db }) =>
    TE.compose(
      TE.map(({ trainTripId }) => trainTripId),
      TE.chain(wrap(db.trainTrips.load)),
      TE.map(trainTrip => trainTrip.lock()),
    ),
)

export default lockTrainTrip
export interface Input {
  trainTripId: string
}
type LockTrainTripError = DbError
