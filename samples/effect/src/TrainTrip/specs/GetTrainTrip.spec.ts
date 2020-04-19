/* eslint-disable jest/no-standalone-expect */

import * as J from "@matechs/test-jest"
import { effect as T } from "@matechs/effect"

import * as H from "./helpers.spec"
import { O } from "@fp-app/fp-ts-extensions"

// Test is the same for happy CreateTrainTrip path
export const GetTrainTripSpec = J.testM(
  "GetTrainTrip",
  T.Do()
    .bind("noneTrainTrip", H.getTrainTripO("some-id"))
    .bind("trainTripId", H.createDefaultTrip)
    .bindL("trainTripAfter", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .return(({ noneTrainTrip, trainTripAfter }) => {
      J.assert.equal(O.isNone(noneTrainTrip), true)
      // TODO: the id generation and createdAt date creators could be injected
      // so that we can verify them back here.
      expect(trainTripAfter).toEqual({
        allowUserModification: true,
        createdAt: expect.any(String),
        id: expect.any(String),
        pax: { adults: 0, babies: 0, children: 6, infants: 0, teenagers: 0 },
        startDate: "2020-12-01T00:00:00.000Z", // TODO: this is wrong!
        travelClass: "second",
        travelClasses: [
          { name: "second", templateId: "template-id1" },
          { name: "first", templateId: "template-id2" },
        ],
      })
    }),
)
