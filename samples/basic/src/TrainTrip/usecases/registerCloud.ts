import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { pipe } from "@fp-app/fp-ts-extensions"
import { defaultDependencies, sendCloudSyncKey } from "./types"
import { wrap } from "../infrastructure/utils"
import { compose, map, chain, chainTup } from "@fp-app/fp-ts-extensions/src/TaskEither"
import { trainTrips } from "@/TrainTrip/infrastructure/TrainTripContext.disk"

const createCommand = createCommandWithDeps(() => ({
  trainTrips,
  sendCloudSync: sendCloudSyncKey,
  ...defaultDependencies,
}))

const registerCloud = createCommand<Input, void, DbError>(
  "registerCloud",
  ({ _, sendCloudSync, trainTrips }) =>
    compose(
      map(({ trainTripId }) => trainTripId),
      chain(wrap(trainTrips.load)),
      chainTup(pipe(sendCloudSync, _.RTE.liftErr)),
      map(([opportunityId, trainTrip]) => trainTrip.assignOpportunity(opportunityId)),
    ),
)

export default registerCloud
export interface Input {
  trainTripId: string
}
