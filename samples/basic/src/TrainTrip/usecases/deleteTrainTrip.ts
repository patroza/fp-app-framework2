import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { TE, compose, createLifters } from "@fp-app/fp-ts-extensions"
import { DbContextKey, defaultDependencies } from "./types"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  ...defaultDependencies,
})

const deleteTrainTrip = createCommand<Input, void, DeleteTrainTripError>(
  "deleteTrainTrip",
  ({ db }) =>
    compose(
      TE.map(({ trainTripId }) => trainTripId),
      TE.chain(lift.TE(db.trainTrips.load)),
      TE.map(x => {
        // TODO: this should normally be on a different object.
        x.delete()
        return db.trainTrips.remove(x)
      }),
    ),
)

const lift = createLifters<DeleteTrainTripError>()

export default deleteTrainTrip
export interface Input {
  trainTripId: string
}
type DeleteTrainTripError = DbError
