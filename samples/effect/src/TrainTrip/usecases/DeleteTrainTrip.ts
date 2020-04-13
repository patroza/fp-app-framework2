import { RecordNotFound } from "@fp-app/framework"
import { pipe, Do, toVoid, O } from "@fp-app/fp-ts-extensions"
import * as TC from "@/TrainTrip/infrastructure/TrainTripContext.disk"
import { t } from "@fp-app/fp-ts-extensions"
import { createPrimitiveValidator } from "@/utils"
import { T } from "@/meffect"
import TrainTrip from "../TrainTrip"

const DeleteTrainTrip = (input: Input) =>
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
    .doL(({ trainTrip }) => pipe(trainTrip.delete(), T.pure))
    .doL(({ trainTrip }) => TC.remove(trainTrip))
    .do(TC.save())
    // ALT
    //   .doL(({ trainTrip }) => {
    //     trainTrip.delete()
    //     trainTrips.remove(trainTrip)
    //     return TE.right(0)
    //   })
    .return(toVoid)

export default DeleteTrainTrip
export const Input = t.type(
  {
    trainTripId: t.NonEmptyString,
  },
  "GetTrainTripInput",
)
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Input extends t.TypeOf<typeof Input> {}

export const validatePrimitives = createPrimitiveValidator<Input, typeof Input>(Input)
