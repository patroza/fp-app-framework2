/* eslint-disable @typescript-eslint/no-empty-interface */
import TrainTrip, { Price } from "@/TrainTrip/TrainTrip"
import {
  createTravelPlanType,
  getTemplateType,
  getTravelPlanType,
} from "@/TrainTrip/usecases/types"
import {
  ApiError,
  ConnectionError,
  InvalidStateError,
  RecordNotFound,
  typedKeysOf,
} from "@fp-app/framework"
import { pipe, TE, E, trampoline, ToolDeps, RTE } from "@fp-app/fp-ts-extensions"
import { v4 } from "uuid"
import { Pax } from "../PaxDefinition"
import { TravelClassName } from "../TravelClassDefinition"
import Trip, { TravelClass, TripWithSelectedTravelClass } from "../Trip"

const getTrip = trampoline(
  (_: ToolDeps<ApiError | InvalidStateError>) => ({
    getTemplate,
  }: {
    getTemplate: getTemplateType
  }) =>
    TE.compose(
      TE.chain(pipe(getTemplate, _.RTE.liftErr)),
      TE.chain(toTrip(getTemplate)),
    ),
)

// would be great to merge here also the dependency configuration
// and the trampoline
const toTrip = trampoline(
  (_: ToolDeps<ApiError | InvalidStateError>) => (getTemplate: getTemplateType) => (
    tpl: Template,
  ) => {
    const currentTravelClass = tplToTravelClass(tpl)
    const resolveTravelClasses = TE.sequence(
      [_.TE.startWith(currentTravelClass)].concat(
        typedKeysOf(tpl.travelClasses)
          .filter(x => x !== currentTravelClass.name)
          .map(slKey => tpl.travelClasses[slKey]!)
          .map(sl => pipe(getTemplate(sl.id), TE.map(tplToTravelClass))),
      ),
    )
    const createTripWithSelectedTravelClass = (trip: Trip) =>
      TripWithSelectedTravelClass.create(trip, currentTravelClass.name)

    return pipe(
      resolveTravelClasses,
      TE.chain(pipe(Trip.create, _.RE.liftErr, E.toTaskEither)),
      TE.chain(pipe(createTripWithSelectedTravelClass, _.RE.liftErr, E.toTaskEither)),
    )
  },
)

const tplToTravelClass = (tpl: Template) =>
  new TravelClass(tpl.id, getTplLevelName(tpl))

const getTplLevelName = (tpl: Template) =>
  typedKeysOf(tpl.travelClasses).find(
    x => tpl.travelClasses[x]!.id === tpl.id,
  ) as TravelClassName

// Typescript support for partial application is not really great, so we try currying instead for now
// https://stackoverflow.com/questions/50400120/using-typescript-for-partial-application
// eslint-disable-next-line @typescript-eslint/require-await
const getTemplateFake = (): getTemplateType => templateId => async () => {
  const tpl = mockedTemplates()[templateId] as Template | undefined
  if (!tpl) {
    return E.err(new RecordNotFound("Template", templateId))
  }
  return E.ok(tpl)
}

const mockedTemplates: () => Record<string, Template> = () => ({
  "template-id1": {
    id: "template-id1",
    travelClasses: { second: { id: "template-id1" }, first: { id: "template-id2" } },
  } as Template,
  "template-id2": {
    id: "template-id2",
    travelClasses: { second: { id: "template-id1" }, first: { id: "template-id2" } },
  } as Template,
})

const getPricingFake = ({
  getTemplate,
}: {
  pricingApiUrl: string
  getTemplate: getTemplateType
}) => (templateId: string) =>
  pipe(getTemplate(templateId), TE.map(getFakePriceFromTemplate))

const getFakePriceFromTemplate = () => ({ price: { amount: 100, currency: "EUR" } })

// eslint-disable-next-line @typescript-eslint/require-await
const createTravelPlanFake = (): createTravelPlanType => () => async () =>
  E.ok<ConnectionError, string>(v4())

const sendCloudSyncFake = (): RTE.ReaderTaskEither<
  TrainTrip,
  ConnectionError,
  string
> => () => TE.right<ConnectionError, string>(v4())

const getTravelPlanFake = (): getTravelPlanType => travelPlanId =>
  TE.right({ id: travelPlanId } as TravelPlan)

export {
  createTravelPlanFake,
  getPricingFake,
  getTemplateFake,
  getTrip,
  sendCloudSyncFake,
  getTravelPlanFake,
}

export interface Conversation {
  id: string

  startDate: string
  pax: Pax
}

export interface Template {
  id: string

  price: Price
  stops: TemplateStop[]

  cityCodes: string[]

  travelClasses: {
    business?: { id: string }
    first?: { id: string }
    second?: { id: string }
  }
}

export interface TravelPlan {
  id: string

  price: Price
  stops: TravelPlanStop[]
  startDate: Date
}

// tslint:disable-next-line:no-empty-interface
interface Stop {}
// tslint:disable-next-line:no-empty-interface
interface TravelPlanStop extends Stop {}
// tslint:disable-next-line:no-empty-interface
interface TemplateStop extends Stop {}
