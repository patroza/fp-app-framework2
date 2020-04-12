import { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import * as RC from "../infrastructure/TrainTripReadContext.disk"

const GetTrainTrip = (input: Input) =>
  // TODO: validate input.
  RC.read(input.trainTripId)

export default GetTrainTrip

export interface Input {
  trainTripId: string
}

export interface TrainTripView {
  id: string
  createdAt: Date

  allowUserModification: boolean

  pax: Pax
  travelClass: TravelClassDefinition
  travelClasses: { templateId: string; name: TravelClassDefinition }[]
  startDate: Date
}
