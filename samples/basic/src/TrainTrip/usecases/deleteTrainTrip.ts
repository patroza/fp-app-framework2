import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { pipe, Do, TE } from "@fp-app/fp-ts-extensions"
import { defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { trainTrips } from "@/TrainTrip/infrastructure/TrainTripContext.disk"

const createCommand = createCommandWithDeps(() => ({
  trainTrips,
  ...defaultDependencies,
}))

const deleteTrainTrip = createCommand<Input, void, DeleteTrainTripError>(
  "deleteTrainTrip",
  ({ _, trainTrips }) => (input) =>
    Do(TE.taskEither)
      .bind(
        "trainTrip",
        pipe(input.trainTripId, pipe(wrap(trainTrips.load), _.RTE.liftErr)),
      )
      .letL("_", ({ trainTrip }) => trainTrip.delete())
      .letL("__", ({ trainTrip }) => trainTrips.remove(trainTrip))
      .return(() => void 0 as void),
)

export default deleteTrainTrip
export interface Input {
  trainTripId: string
}
type DeleteTrainTripError = DbError
