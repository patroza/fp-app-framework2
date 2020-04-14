import { Do, toVoid } from "@fp-app/fp-ts-extensions"
import { T } from "@/meffect"
import * as TC from "@/TrainTrip/infrastructure/TrainTripContext.disk"
import * as API from "@/TrainTrip/infrastructure/api"
import TrainTrip from "@/TrainTrip/TrainTrip"
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
