/* eslint-disable jest/no-standalone-expect */

import * as J from "@matechs/test-jest"
import { effect as T } from "@matechs/effect"
import { Do } from "fp-ts-contrib/lib/Do"

import * as H from "./helpers.spec"

// Test is the same for happy CreateTrainTrip path
export const CreateTrainTripSpec = J.testM(
  "CreateTrainTrip",
  Do(T.effect)
    .bind("result", H.createDefaultTrip)
    .bindL("trainTripAfter", ({ result }) => H.getTrainTrip(result))
    .return(({ result, trainTripAfter }) => {
      expect(result).toEqual(expect.any(String))

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
