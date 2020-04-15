import { Do, toVoid } from "@fp-app/fp-ts-extensions"
import { T } from "@e/meffect"
import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"
import * as API from "@e/TrainTrip/infrastructure/api"
import TrainTrip from "@e/TrainTrip/TrainTrip"
import { saveT } from "../infrastructure/saveTrainTrip"

const RegisterCloud = (input: Input) =>
  Do(T.effect)
    .bind("trainTrip", TC.loadE(input.trainTripId))
    .bindL("opportunityId", ({ trainTrip }) => API.sendCloudSync(trainTrip))
    .bindL("result", ({ opportunityId, trainTrip }) =>
      T.sync(() => TrainTrip.assignOpportunity(trainTrip)(opportunityId)),
    )
    .bindL("updatedTrainTrip", ({ result }) => saveT(result))
    // TODO: events
    .return(toVoid)

export default RegisterCloud
export interface Input {
  trainTripId: string
}
