import TrainTrip, { Price } from "@/TrainTrip/TrainTrip"
import {
  ApiError,
  generateKey,
  RecordContext,
  RequestContextBase,
  UnitOfWork,
} from "@fp-app/framework"
import { AsyncResult, RTE } from "@fp-app/fp-ts-extensions"
//import { TrainTripPublisher } from "../eventhandlers"
import { sendCloudSyncFake, Template, TravelPlan } from "../infrastructure/api"
import PaxDefinition from "../PaxDefinition"

export const sendCloudSyncKey = generateKey<ReturnType<typeof sendCloudSyncFake>>(
  "sendCloudSync",
)
export type getTravelPlanType = RTE.ReaderTaskEither<string, ApiError, TravelPlan>
export type getTemplateType = RTE.ReaderTaskEither<string, ApiError, Template>
export type getPricingType = (
  templateId: string,
  pax: PaxDefinition,
  startDate: Date,
) => AsyncResult<{ price: Price }, ApiError>
export type createTravelPlanType = (
  templateId: string,
  info: { pax: PaxDefinition; startDate: Date },
) => AsyncResult<string, ApiError>

// tslint:disable-next-line:no-empty-interface
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ReadonlyContext {}

export interface ReadonlyTrainTripContext extends ReadonlyContext {
  trainTrips: RecordContext<TrainTrip>
}

export interface TrainTripContext extends ReadonlyTrainTripContext, UnitOfWork {}

// tslint:disable-next-line:no-empty-interface
export type RequestContext = RequestContextBase & Record<string, unknown>

export const RequestContextKey = generateKey<RequestContext>("request-context")
// export const TrainTripPublisherKey = generateKey<TrainTripPublisher>(
//   "trainTripPublisher",
// )

export const defaultDependencies = { context: RequestContextKey }
