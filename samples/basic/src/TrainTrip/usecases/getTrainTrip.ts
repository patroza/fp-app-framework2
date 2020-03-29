import { createQueryWithDeps, DbError } from "@fp-app/framework"
import TrainTripReadContext from "../infrastructure/TrainTripReadContext.disk"
import { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { defaultDependencies } from "./types"

const createQuery = createQueryWithDeps(() => ({
  readCtx: TrainTripReadContext,
  ...defaultDependencies,
}))

const getTrainTrip = createQuery<Input, TrainTripView, DbError>(
  "getTrainTrip",
  ({ readCtx }) => (input) => readCtx.read(input.trainTripId),
)

export default getTrainTrip
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
