import { DbError } from "@fp-app/framework"
import { defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { lock } from "../TrainTrip"
import { trainTrips } from "@c/TrainTrip/infrastructure/TrainTripContext.disk"
import { tupled } from "fp-ts/lib/function"
import { TE, pipe } from "@fp-app/fp-ts-extensions"
import { createCommandWithDeps } from "@fp-app/framework-classic"

const createCommand = createCommandWithDeps(() => ({
  trainTrips,
  ...defaultDependencies,
}))

const lockTrainTrip = createCommand<Input, void, LockTrainTripError>(
  "lockTrainTrip",
  ({ trainTrips }) => (input) =>
    TE.Do()
      .bind("trainTrip", pipe(input.trainTripId, wrap(trainTrips.load)))
      .bindL("events", ({ trainTrip }) => TE.right(lock(trainTrip)(new Date())))
      .return(({ events }) => tupled(trainTrips.processEvents)(events)),
)

export default lockTrainTrip
export interface Input {
  trainTripId: string
}
type LockTrainTripError = DbError
