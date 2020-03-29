import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { pipe } from "@fp-app/fp-ts-extensions"
import { defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import { compose, map, chain } from "@fp-app/fp-ts-extensions/src/TaskEither"
import { trainTrips } from "@/TrainTrip/infrastructure/TrainTripContext.disk"

const createCommand = createCommandWithDeps(() => ({
  trainTrips,
  ...defaultDependencies,
}))

const deleteTrainTrip = createCommand<Input, void, DeleteTrainTripError>(
  "deleteTrainTrip",
  ({ _, trainTrips }) =>
    compose(
      map(({ trainTripId }) => trainTripId),
      chain(pipe(wrap(trainTrips.load), _.RTE.liftErr)),
      // TODO: this should normally be on a different object.
      map((x) => {
        x.delete()
        trainTrips.remove(x)
      }),
    ),
)

export default deleteTrainTrip
export interface Input {
  trainTripId: string
}
type DeleteTrainTripError = DbError
