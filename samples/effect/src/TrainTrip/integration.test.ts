import * as TA from "@e/TrainTrip/infrastructure/api"
import * as TTP from "@e/TrainTrip/infrastructure/trainTripPublisher.inMemory"
import * as J from "@matechs/test-jest"
import { effect as T, exit as E, managed as M } from "@matechs/effect"
import { queueSpec } from "./specs/Queue"
import { flow } from "fp-ts/lib/function"

const integrationSuite = J.suite("Integration")(queueSpec)

J.run(integrationSuite)(
  flow(
    TA.provideTripApi,
    TTP.provideTrainTripPublisher,
    T.provideR((r) => ({
      ...r,
      [TTP.contextEnv]: { ctx: new TTP.default() },
    })),
  ),
)
