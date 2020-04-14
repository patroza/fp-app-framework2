import { Do, toVoid } from "@fp-app/fp-ts-extensions"
import { T } from "@/meffect"
import * as TC from "@/TrainTrip/infrastructure/TrainTripContext.disk"
import * as API from "@/TrainTrip/infrastructure/api"

const RegisterCloud = (input: Input) =>
  Do(T.effect)
    .bind("trainTrip", TC.loadE(input.trainTripId))
    .bindL("opportunityId", ({ trainTrip }) => API.sendCloudSync(trainTrip))
    .doL(({ opportunityId, trainTrip }) =>
      T.sync(() => trainTrip.assignOpportunity(opportunityId)),
    )
    .do(TC.save())
    // TODO: events
    .return(toVoid)

export default RegisterCloud
export interface Input {
  trainTripId: string
}
