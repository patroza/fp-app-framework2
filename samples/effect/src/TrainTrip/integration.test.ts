import * as TA from "@e/TrainTrip/infrastructure/api"
import * as TTP from "@e/TrainTrip/infrastructure/trainTripPublisher.inMemory"
import * as J from "@matechs/test-jest"
import { effect as T } from "@matechs/effect"
import { queueSpec } from "./specs/Queue.spec"
import { CreateTrainTripSpec } from "./specs/CreateTrainTrip.spec"
import { GetTrainTripSpec } from "./specs/GetTrainTrip.spec"
import { ChangeTrainTripSpec } from "./specs/ChangeTrainTrip.spec"
import { DeleteTrainTripSpec } from "./specs/DeleteTrainTrip.spec"
import { initialize } from "@e/server"
import { combineProviders } from "@e/framework"

beforeAll(() => initialize())

const integrationSuite = J.suite("Integration")(
  CreateTrainTripSpec,
  ChangeTrainTripSpec,
  GetTrainTripSpec,
  DeleteTrainTripSpec,
  queueSpec,
)

J.run(integrationSuite)(
  combineProviders()
    .with(TA.provideTripApi)
    .with(TTP.provideTrainTripPublisher)
    .with(
      T.provide<TTP.Context>({
        [TTP.contextEnv]: { ctx: new TTP.default() },
      }),
    )
    .done(),
)
