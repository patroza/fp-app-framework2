import * as J from "@matechs/test-jest"
import { effect as T } from "@matechs/effect"
import { Do } from "fp-ts-contrib/lib/Do"
import executeReceived from "../eventhandlers/external"

import * as H from "./helpers.spec"

export const queueSpec = J.testM(
  "queue",
  Do(T.effect)
    .bind(
      "trainTripId",
      H.createTrainTrip({
        templateId: "template-id1",
        startDate: "2020-12-01",
        pax: { adults: 0, children: 6, babies: 0, infants: 0, teenagers: 0 },
      }),
    )
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
