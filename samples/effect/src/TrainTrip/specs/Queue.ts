import * as J from "@matechs/test-jest"
import { effect as T, exit as E, managed as M } from "@matechs/effect"
import { Do } from "fp-ts-contrib/lib/Do"
import executeReceived from "../queueReceiver"
import * as CreateTrainTrip from "../usecases/CreateTrainTrip"
import * as GetTrainTrip from "../usecases/GetTrainTrip"
import { O } from "@fp-app/fp-ts-extensions"
import provideRequestScoped from "../provideRequestScoped"

const createTrainTrip = (inp: unknown) =>
  provideRequestScoped(
    Do(T.effect)
      .bind("input", T.fromEither(CreateTrainTrip.validatePrimitives(inp)))
      .bindL("trainTripId", ({ input }) =>
        provideRequestScoped(CreateTrainTrip.default(input)),
      )
      .return((r) => r.trainTripId),
  )

const getTrainTrip = (trainTripId: string) =>
  provideRequestScoped(
    Do(T.effect)
      .bind("input", T.fromEither(GetTrainTrip.validatePrimitives({ trainTripId })))
      .bindL("result", ({ input }) =>
        T.effect.chain(GetTrainTrip.default(input), (o) =>
          O.isSome(o) ? T.pure(o.value) : T.raiseAbort(new Error("must exist")),
        ),
      )
      .return((r) => r.result),
  )

export const queueSpec = J.testM(
  "queue",
  Do(T.effect)
    .bind(
      "trainTripId",
      createTrainTrip({
        templateId: "template-id1",
        startDate: "2020-12-01",
        pax: { adults: 0, children: 6, babies: 0, infants: 0, teenagers: 0 },
      }),
    )
    .bindL("trainTrip", ({ trainTripId }) => getTrainTrip(trainTripId))
    .doL(({ trainTripId }) =>
      executeReceived({ trainTripId, type: "CustomerRequestedChanges" }),
    )
    .bindL("trainTripAfter", ({ trainTripId }) => getTrainTrip(trainTripId))
    .return(({ trainTrip, trainTripAfter }) => {
      J.assert.equal(trainTrip.allowUserModification, true)
      J.assert.equal(trainTripAfter.allowUserModification, false)
    }),
)
