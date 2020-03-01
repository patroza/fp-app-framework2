import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { pipe, TE, compose, chainTupTask } from "@fp-app/fp-ts-extensions"
import { DbContextKey, defaultDependencies, sendCloudSyncKey } from "./types"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  sendCloudSync: sendCloudSyncKey,
  ...defaultDependencies,
})

const registerCloud = createCommand<Input, void, DbError>(
  "registerCloud",
  ({ db, sendCloudSync, tools }) =>
    compose(
      TE.map(({ trainTripId }) => trainTripId),
      TE.chain(db.trainTrips.load),
      chainTupTask(pipe(sendCloudSync, tools.liftTE)),
      TE.map(([opportunityId, trainTrip]) =>
        trainTrip.assignOpportunity(opportunityId),
      ),
    ),
)

export default registerCloud
export interface Input {
  trainTripId: string
}
