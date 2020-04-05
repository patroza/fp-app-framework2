import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { pipe, Do, TE } from "@fp-app/fp-ts-extensions"
import { defaultDependencies, sendCloudSyncKey } from "./types"
import { wrap } from "../infrastructure/utils"
import { trainTrips } from "@/TrainTrip/infrastructure/TrainTripContext.disk"

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
      .letL("", ({ opportunityId, trainTrip }) =>
        trainTrip.assignOpportunity(opportunityId),
      )
      .return(() => void 0 as void),
)

export default registerCloud
export interface Input {
  trainTripId: string
}
