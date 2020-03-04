import { createQueryWithDeps, DbError } from "@fp-app/framework"
import { trainTripReadContextKey } from "../infrastructure/TrainTripReadContext.disk"
import { Pax } from "../PaxDefinition"
import { TravelClassName } from "../TravelClassDefinition"
import { defaultDependencies } from "./types"

const createQuery = createQueryWithDeps({
  readCtx: trainTripReadContextKey,
  ...defaultDependencies,
})

const getTrainTrip = createQuery<Input, TrainTripView, DbError>(
  "getTrainTrip",
  ({ readCtx }) => input => readCtx.read(input.trainTripId),
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
  travelClass: TravelClassName
  travelClasses: { templateId: string; name: TravelClassName }[]
  startDate: Date
}
