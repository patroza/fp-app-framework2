import TrainTrip, { Price } from "@e/TrainTrip/TrainTrip"
import { ApiError, RecordContext, UnitOfWork } from "@fp-app/framework"
import { AsyncResult, TE } from "@fp-app/fp-ts-extensions"
//import { TrainTripPublisher } from "../eventhandlers"
import { Template, TravelPlan } from "../infrastructure/api"
import PaxDefinition from "../PaxDefinition"

export type getTravelPlanType = (id: string) => TE.TaskEither<ApiError, TravelPlan>
export type getTemplateType = (id: string) => TE.TaskEither<ApiError, Template>
export type getPricingType = (
  templateId: string,
  pax: PaxDefinition,
  startDate: Date,
) => AsyncResult<{ price: Price }, ApiError>
export type createTravelPlanType = (
  templateId: string,
  info: { pax: PaxDefinition; startDate: Date },
) => AsyncResult<string, ApiError>

export interface ReadonlyTrainTripContext {
  trainTrips: RecordContext<TrainTrip>
}

export interface TrainTripContext extends ReadonlyTrainTripContext, UnitOfWork {}
