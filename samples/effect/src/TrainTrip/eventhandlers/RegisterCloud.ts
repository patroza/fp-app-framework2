import { toVoid, pipe } from "@fp-app/fp-ts-extensions"
import { T } from "@e/framework"
import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"
import * as API from "@e/TrainTrip/infrastructure/api"
import TrainTrip from "@e/TrainTrip/TrainTrip"
import { saveT } from "../infrastructure/saveTrainTrip"

const RegisterCloud = (input: Input) =>
  T.Do()
    .bind("trainTrip", TC.loadE(input.trainTripId))
    .bindL("opportunityId", ({ trainTrip }) => API.sendCloudSync(trainTrip))
    .bindL("result", ({ opportunityId, trainTrip }) =>
      T.sync(() => pipe(trainTrip, TrainTrip.assignOpportunity(opportunityId))),
    )
    .bindL("updatedTrainTrip", ({ result }) => saveT(result))
    // TODO: events
    .return(toVoid)

export default RegisterCloud
export interface Input {
  trainTripId: string
}
