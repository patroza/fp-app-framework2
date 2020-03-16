import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { DbContextKey, defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { lock } from "../TrainTrip"
import { tuple } from "fp-ts/lib/function"
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
      map(trainTrip => tuple(trainTrip, ...lock(trainTrip)())),
      map(([trainTrip, newTT, events]) => {
        Object.assign(trainTrip, newTT)
        events.forEach(trainTrip.registerDomainEvent)
      }),
    ),
)

export default lockTrainTrip
export interface Input {
  trainTripId: string
}
type LockTrainTripError = DbError
