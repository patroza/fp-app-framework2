import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { pipe } from "@fp-app/fp-ts-extensions"
import { DbContextKey, defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { compose, map, chain } from "@fp-app/fp-ts-extensions/src/TaskEither"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  ...defaultDependencies,
})

const deleteTrainTrip = createCommand<Input, void, DeleteTrainTripError>(
  "deleteTrainTrip",
  ({ _, db }) =>
    compose(
      map(({ trainTripId }) => trainTripId),
      chain(pipe(wrap(db.trainTrips.load), _.RTE.liftErr)),
      // TODO: this should normally be on a different object.
      map(x => {
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
