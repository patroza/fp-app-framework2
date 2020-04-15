import { DbError } from "@fp-app/framework"
import { pipe, Do, TE, toVoid } from "@fp-app/fp-ts-extensions"
import { defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { trainTrips } from "@c/TrainTrip/infrastructure/TrainTripContext.disk"
import { createCommandWithDeps } from "@fp-app/framework-classic"

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
      .doL(({ trainTrip }) => pipe(trainTrip.delete(), TE.right))
      .doL(({ trainTrip }) => pipe(trainTrips.remove(trainTrip), TE.right))
      // ALT
      //   .doL(({ trainTrip }) => {
      //     trainTrip.delete()
      //     trainTrips.remove(trainTrip)
      //     return TE.right(0)
      //   })
      .return(toVoid),
)

export default deleteTrainTrip
export interface Input {
  trainTripId: string
}
type DeleteTrainTripError = DbError
