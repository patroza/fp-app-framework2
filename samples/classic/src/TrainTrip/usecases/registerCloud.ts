import { DbError } from "@fp-app/framework"
import { createCommandWithDeps } from "@fp-app/framework-classic"
import { pipe, TE, toVoid, RTE } from "@fp-app/fp-ts-extensions"
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
  ({ sendCloudSync, trainTrips }) => (input) =>
    TE.Do()
      .bind("trainTrip", pipe(input.trainTripId, wrap(trainTrips.load)))
      .bindL("opportunityId", ({ trainTrip }) =>
        pipe(trainTrip, pipe(sendCloudSync, RTE.liftErr<DbError>())),
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
