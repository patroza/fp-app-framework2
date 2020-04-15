import * as TA from "@e/TrainTrip/infrastructure/api"
import * as TTP from "@e/TrainTrip/infrastructure/trainTripPublisher.inMemory"
import * as J from "@matechs/test-jest"
import { effect as T } from "@matechs/effect"
import { queueSpec } from "./specs/Queue.spec"
import { CreateTrainTripSpec } from "./specs/CreateTrainTrip.spec"
import { GetTrainTripSpec } from "./specs/GetTrainTrip.spec"
import { ChangeTrainTripSpec } from "./specs/ChangeTrainTrip.spec"
import { DeleteTrainTripSpec } from "./specs/DeleteTrainTrip.spec"
import { flow } from "fp-ts/lib/function"

const integrationSuite = J.suite("Integration")(
  CreateTrainTripSpec,
  ChangeTrainTripSpec,
  GetTrainTripSpec,
  DeleteTrainTripSpec,
  queueSpec,
)

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
