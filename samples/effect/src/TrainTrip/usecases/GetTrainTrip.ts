import { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { effect as T } from "@matechs/effect"
import * as O from "fp-ts/lib/Option"
import { HasReadContext } from "../infrastructure/TrainTripReadContext.disk"
import * as RC from "../infrastructure/TrainTripReadContext.disk"

const GetTrainTrip: (
  input: Input,
) => T.Effect<HasReadContext, never, O.Option<TrainTripView>> = (input) =>
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
