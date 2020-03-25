import {
  createDependencyNamespace,
  factoryOf,
  Key,
  logger,
  resolveEventKey,
  UOWKey,
  toolDepsKey,
} from "@fp-app/framework"
import { exists, mkdir } from "@fp-app/io.diskdb"
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
import TrainTripReadContext, {
  trainTripReadContextKey,
} from "./TrainTrip/infrastructure/TrainTripReadContext.disk"
import {
  getTripKey,
  RequestContextKey,
  sendCloudSyncKey,
  TrainTripPublisherKey,
} from "./TrainTrip/usecases/types"
import { toolDeps } from "@fp-app/fp-ts-extensions"

const createRoot = () => {
  const {
    addToLoggingContext,
    bindLogger,
    container,
    publishInNewContext,

    request,
    setupRequestContext,
  } = createDependencyNamespace(namespace, RequestContextKey)

  container.registerScopedF2(
    (trainTrips as any) as Key<ReturnType<typeof trainTrips>>,
    trainTrips,
  )
  container.registerScopedF2(
    (DiskDBContext as any) as Key<ReturnType<typeof DiskDBContext>>,
    DiskDBContext,
  )
  container.registerPassthrough(UOWKey, DiskDBContext as any)

  container.registerSingletonC2(TrainTripPublisherKey, TrainTripPublisherInMemory)
  container.registerSingletonC2(trainTripReadContextKey, TrainTripReadContext)
  container.registerSingletonF(sendCloudSyncKey, factoryOf(sendCloudSyncFake))
  container.registerSingletonF(getTripKey, () => {
    const { getTrip: getTripF } = createInventoryClient({
      templateApiUrl: "http://localhost:8110",
    })
    return getTripF
  })

  container.registerSingletonO(toolDepsKey, toolDeps)

  container.registerSingletonF(resolveEventKey, () => resolveEvent())

  // Prevent stack-overflow; as logger depends on requestcontext
  // tslint:disable-next-line:no-console
  const consoleOrLogger = (key: any) => (key !== RequestContextKey ? logger : console)
  container.registerInitializerF("global", (i, key) =>
    consoleOrLogger(key).debug(
      chalk.magenta(`Created function of ${key.name} (${i.name})`),
    ),
  )
  container.registerInitializerC("global", (i, key) =>
    consoleOrLogger(key).debug(
      chalk.magenta(`Created instance of ${key.name} (${i.constructor.name})`),
    ),
  )
  container.registerInitializerO("global", (i, key) =>
    consoleOrLogger(key).debug(
      chalk.magenta(`Created object of ${key.name} (${i.constructor.name})`),
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
  if (!(await exists("./data"))) {
    await mkdir("./data")
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
