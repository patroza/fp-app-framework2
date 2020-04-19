/* eslint-disable jest/no-standalone-expect */
import * as J from "@matechs/test-jest"
import { effect as T } from "@matechs/effect"
import { Do } from "fp-ts-contrib/lib/Do"
import executeReceived from "../queueRouter"
import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"

import * as H from "./helpers.spec"
import provideRequestScoped from "../provideRequestScoped"
import { pipe } from "@fp-app/fp-ts-extensions"

const CustomerRequestedChanges = J.testM(
  "CustomerRequestedChanges",
  Do(T.effect)
    .bind("trainTripId", H.createDefaultTrip)
    .bindL("trainTrip", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .doL(({ trainTripId }) =>
      executeReceived({ trainTripId, type: "CustomerRequestedChanges" }),
    )
    .bindL("trainTripAfter", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .return(({ trainTrip, trainTripAfter }) => {
      J.assert.equal(trainTrip.allowUserModification, true)
      J.assert.equal(trainTripAfter.allowUserModification, false)
    }),
)

const RegisterOnCloud = J.testM(
  "RegisterOnCloud",
  Do(T.effect)
    .bind("trainTripId", H.createDefaultTrip)
    .bindL("trainTrip", ({ trainTripId }) =>
      pipe(TC.loadE(trainTripId), provideRequestScoped()),
    )
    .doL(({ trainTripId }) => executeReceived({ trainTripId, type: "RegisterOnCloud" }))
    .bindL("trainTripAfter", ({ trainTripId }) =>
      pipe(TC.loadE(trainTripId), provideRequestScoped()),
    )
    .return(({ trainTrip, trainTripAfter }) => {
      J.assert.equal(trainTrip.opportunityId, undefined)
      expect(trainTripAfter.opportunityId).toEqual(expect.any(String))
    }),
)

export const queueSpec = J.suite("QueueRouter")(
  CustomerRequestedChanges,
  RegisterOnCloud,
)
