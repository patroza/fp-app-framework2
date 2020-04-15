import { DbError } from "@fp-app/framework"
import { createCommandWithDeps } from "@fp-app/framework-classic"
import { pipe, Do, TE, toVoid } from "@fp-app/fp-ts-extensions"
import { defaultDependencies, sendCloudSyncKey } from "./types"
import { wrap } from "../infrastructure/utils"
import { trainTrips } from "@c/TrainTrip/infrastructure/TrainTripContext.disk"

const createCommand = createCommandWithDeps(() => ({
  trainTrips,
  sendCloudSync: sendCloudSyncKey,
  ...defaultDependencies,
}))

const registerCloud = createCommand<Input, void, DbError>(
  "registerCloud",
  ({ _, sendCloudSync, trainTrips }) => (input) =>
    Do(TE.taskEither)
      .bind("trainTrip", pipe(input.trainTripId, wrap(trainTrips.load)))
      .bindL("opportunityId", ({ trainTrip }) =>
        pipe(trainTrip, pipe(sendCloudSync, _.RTE.liftErr)),
      )
      .doL(({ opportunityId, trainTrip }) =>
        pipe(trainTrip.assignOpportunity(opportunityId), TE.right),
      )
      .return(toVoid),
)

export default registerCloud
export interface Input {
  trainTripId: string
}
