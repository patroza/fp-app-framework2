import { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import * as RC from "../infrastructure/TrainTripReadContext.disk"
import { t } from "@fp-app/fp-ts-extensions"
import { createPrimitiveValidator } from "@/utils"

const GetTrainTrip = (input: Input) => RC.read(input.trainTripId)

export default GetTrainTrip

export const Input = t.type(
  {
    trainTripId: t.NonEmptyString,
  },
  "GetTrainTripInput",
)
export interface Input extends t.TypeOf<typeof Input> {}

export const validatePrimitives = createPrimitiveValidator<Input, typeof Input>(Input)

export interface TrainTripView {
  id: string
  createdAt: Date

  allowUserModification: boolean

  pax: Pax
  travelClass: TravelClassDefinition
  travelClasses: { templateId: string; name: TravelClassDefinition }[]
  startDate: Date
}
