import { Do } from "@fp-app/fp-ts-extensions"
import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"
import { t } from "@fp-app/fp-ts-extensions"
import { createPrimitiveValidator } from "@e/utils"
import { T } from "@e/meffect"
import TrainTrip from "../TrainTrip"
import save from "../infrastructure/saveTrainTrip"

const DeleteTrainTrip = (input: Input) =>
  T.asUnit(
    Do(T.effect)
      .bind("trainTrip", TC.loadE(input.trainTripId))
      .bindL("result", ({ trainTrip }) => T.sync(() => TrainTrip.del(trainTrip)))
      .doL(({ result: [tt, events] }) => save(tt, events, "delete"))
      .done(),
  )

export default DeleteTrainTrip
export const Input = t.type(
  {
    trainTripId: t.NonEmptyString,
  },
  "GetTrainTripInput",
)
export interface Input extends t.TypeOf<typeof Input> {}

export const validatePrimitives = createPrimitiveValidator<Input, typeof Input>(Input)
