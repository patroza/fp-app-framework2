import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"
import { IT, I } from "@fp-app/fp-ts-extensions"
import { createPrimitiveValidator } from "@e/utils"
import { T } from "@e/framework"
import TrainTrip from "../TrainTrip"
import save from "../infrastructure/saveTrainTrip"

const DeleteTrainTrip = (input: Input) =>
  T.asUnit(
    T.Do()
      .bind("trainTrip", TC.loadE(input.trainTripId))
      .bindL("result", ({ trainTrip }) => T.sync(() => TrainTrip.del(trainTrip)))
      .doL(({ result: [tt, events] }) => save(tt, events, "delete"))
      .done(),
  )

export default DeleteTrainTrip
export const Input = I.type(
  {
    trainTripId: IT.NonEmptyString.NonEmptyString,
  },
  "GetTrainTripInput",
)
export interface Input extends I.TypeOf<typeof Input> {}

export const validatePrimitives = createPrimitiveValidator<Input, typeof Input>(Input)
