import { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import * as RC from "../infrastructure/TrainTripReadContext.disk"
import { I, IT } from "@fp-app/fp-ts-extensions"
import { createPrimitiveValidator } from "@e/utils"

const GetTrainTrip = (input: Input) => RC.read(input.trainTripId)

export default GetTrainTrip

export const Input = I.type(
  {
    trainTripId: IT.NonEmptyString.NonEmptyString,
  },
  "GetTrainTripInput",
)
export interface Input extends I.TypeOf<typeof Input> {}

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
