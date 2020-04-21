import * as FW from "@fp-app/framework"
import * as FWC from "@fp-app/framework-classic"
import * as diskdb from "@fp-app/io.diskdb"
import chalk from "chalk"
import resolveEvent from "./resolveIntegrationEvent"
import "./TrainTrip/eventhandlers" // To be ble to auto register them :/
import {
  getPricingFake,
  getTemplateFake,
  getTrip,
  sendCloudSyncFake,
} from "./TrainTrip/infrastructure/api"
import DiskDBContext, {
  trainTrips,
} from "./TrainTrip/infrastructure/TrainTripContext.disk"
import TrainTripPublisherInMemory from "./TrainTrip/infrastructure/trainTripPublisher.inMemory"
import TrainTripReadContext from "./TrainTrip/infrastructure/TrainTripReadContext.disk"
import {
  RequestContextKey,
  sendCloudSyncKey,
  TrainTripPublisherKey,
} from "./TrainTrip/usecases/types"

const createRoot = () => {
  const {
    addToLoggingContext,
    bindLogger,
    container,
    publishInNewContext,

    request,
    setupRequestContext,
  } = FWC.createDependencyNamespace(namespace, RequestContextKey)

  container.registerScopedF(
    trainTrips as FWC.Key<ReturnType<typeof trainTrips>>,
    trainTrips,
  )
  container.registerScopedF(
    (DiskDBContext as unknown) as FWC.Key<ReturnType<typeof DiskDBContext>>,
    DiskDBContext,
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  container.registerPassthrough(FWC.UOWKey, DiskDBContext as any)

  container.registerSingletonC(TrainTripPublisherKey, TrainTripPublisherInMemory)
  container.registerSingletonC(TrainTripReadContext, TrainTripReadContext)
  container.registerSingletonF(sendCloudSyncKey, sendCloudSyncFake)
  container.registerSingletonF(getTrip, () => {
    const { getTrip: getTripF } = createInventoryClient({
      templateApiUrl: "http://localhost:8110",
    })
    return getTripF
  })

  container.registerSingletonF(FWC.resolveEventKey, resolveEvent)

  // Prevent stack-overflow; as logger depends on requestcontext
  // tslint:disable-next-line:no-console
  const consoleOrLogger = (key: FW.AnyConstructable) =>
    key !== RequestContextKey ? FW.utils.logger : console
  container.registerInitializer("global", (i, key) =>
    consoleOrLogger(key).debug(
      chalk.magenta(`Created ${key.name} (${i.name}) (${i.constructor.name})`),
    ),
  )

  return {
    addToLoggingContext,
    bindLogger,
    initialize,
    setupRequestContext,

    publishInNewContext,
    request,
  }
}

const initialize = async () => {
  if (!(await diskdb.utils.exists("./data"))) {
    await diskdb.utils.mkdir("./data")
  }
}

const namespace = "train-trip-service"

export default createRoot

const createInventoryClient = ({ templateApiUrl }: { templateApiUrl: string }) => {
  const getTemplate = getTemplateFake()
  return {
    getPricing: getPricingFake({ getTemplate, pricingApiUrl: templateApiUrl }),
    getTemplate,
    getTrip: getTrip({ getTemplate }),
  }
}
