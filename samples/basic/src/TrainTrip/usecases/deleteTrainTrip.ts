import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { TE, pipe } from "@fp-app/fp-ts-extensions"
import { DbContextKey, defaultDependencies } from "./types"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  ...defaultDependencies,
})

const deleteTrainTrip = createCommand<Input, void, DeleteTrainTripError>(
  "deleteTrainTrip",
  ({ _, db }) =>
    TE.compose(
      TE.map(({ trainTripId }) => trainTripId),
      TE.chain(pipe(db.trainTrips.load, _.TE.liftErr)),
      // TODO: this should normally be on a different object.
      TE.map(x => {
        x.delete()
        db.trainTrips.remove(x)
      }),
    ),
)

export default deleteTrainTrip
export interface Input {
  trainTripId: string
}
type DeleteTrainTripError = DbError
