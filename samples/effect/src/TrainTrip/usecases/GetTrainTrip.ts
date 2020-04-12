import { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import * as RC from "../infrastructure/TrainTripReadContext.disk"
import { t } from "@fp-app/fp-ts-extensions"

const GetTrainTrip = (input: Input) => RC.read(input.trainTripId)

export default GetTrainTrip

export const Input = t.type(
  {
    trainTripId: t.NonEmptyString,
  },
  "GetTrainTripInput",
)
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Input extends t.TypeOf<typeof Input> {}

export interface TrainTripView {
  id: string
  createdAt: Date

  allowUserModification: boolean

  pax: Pax
  travelClass: TravelClassDefinition
  travelClasses: { templateId: string; name: TravelClassDefinition }[]
  startDate: Date
}
