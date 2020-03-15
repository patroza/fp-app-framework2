import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { pipe, TE } from "@fp-app/fp-ts-extensions"
import { DbContextKey, defaultDependencies, sendCloudSyncKey } from "./types"
import { wrap } from "../infrastructure/utils"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  sendCloudSync: sendCloudSyncKey,
  ...defaultDependencies,
})

const registerCloud = createCommand<Input, void, DbError>(
  "registerCloud",
  ({ _, db, sendCloudSync }) =>
    TE.compose(
      TE.map(({ trainTripId }) => trainTripId),
      TE.chain(wrap(db.trainTrips.load)),
      TE.chainTup(pipe(sendCloudSync, _.RTE.liftErr)),
      TE.map(([opportunityId, trainTrip]) =>
        trainTrip.assignOpportunity(opportunityId),
      ),
    ),
)

export default registerCloud
export interface Input {
  trainTripId: string
}
