import { RecordNotFound } from "@fp-app/framework"
import { pipe, Do, toVoid, O } from "@fp-app/fp-ts-extensions"
import { T } from "@/meffect"
import TrainTrip from "../TrainTrip"
import * as TC from "@/TrainTrip/infrastructure/TrainTripContext.disk"
import * as API from "@/TrainTrip/infrastructure/api"

const RegisterCloud = (input: Input) =>
  Do(T.effect)
    .bind(
      "trainTrip",
      pipe(
        TC.load(input.trainTripId),
        // "wrap"
        T.chain(
          O.fold(
            () => T.raiseError(new RecordNotFound("trainTrip", input.trainTripId)),
            (x) => T.pure(x) as T.Effect<unknown, RecordNotFound, TrainTrip>,
          ),
        ),
      ),
    )
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
