import { createCommandWithDeps, DbError } from "@fp-app/framework"
import { pipe } from "@fp-app/fp-ts-extensions"
import { DbContextKey, defaultDependencies, sendCloudSyncKey } from "./types"
import { wrap } from "../infrastructure/utils"
import { compose, map, chain, chainTup } from "@fp-app/fp-ts-extensions/src/TaskEither"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  sendCloudSync: sendCloudSyncKey,
  ...defaultDependencies,
})

const registerCloud = createCommand<Input, void, DbError>(
  "registerCloud",
  ({ _, db, sendCloudSync }) =>
    compose(
      map(({ trainTripId }) => trainTripId),
      chain(wrap(db.trainTrips.load)),
      chainTup(pipe(sendCloudSync, _.RTE.liftErr)),
      map(([opportunityId, trainTrip]) => trainTrip.assignOpportunity(opportunityId)),
    ),
)

export default registerCloud
export interface Input {
  trainTripId: string
}
