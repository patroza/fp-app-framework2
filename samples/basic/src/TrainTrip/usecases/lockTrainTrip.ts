import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { TE } from "@fp-app/fp-ts-extensions"
import { DbContextKey, defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { lock } from "../TrainTrip"
import { tuple } from "fp-ts/lib/function"

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
      TE.map(trainTrip => tuple(trainTrip, ...lock(trainTrip)())),
      TE.map(([trainTrip, newTT, events]) => {
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
