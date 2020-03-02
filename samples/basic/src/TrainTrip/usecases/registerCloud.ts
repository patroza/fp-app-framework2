import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { pipe, TE, compose } from "@fp-app/fp-ts-extensions"
import { DbContextKey, defaultDependencies, sendCloudSyncKey } from "./types"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  sendCloudSync: sendCloudSyncKey,
  ...defaultDependencies,
})

const registerCloud = createCommand<Input, void, DbError>(
  "registerCloud",
  ({ _, db, sendCloudSync }) =>
    compose(
      TE.map(({ trainTripId }) => trainTripId),
      TE.chain(db.trainTrips.load),
      TE.chainTup(pipe(sendCloudSync, _.liftTE)),
      TE.map(([opportunityId, trainTrip]) =>
        trainTrip.assignOpportunity(opportunityId),
      ),
    ),
)

export default registerCloud
export interface Input {
  trainTripId: string
}
