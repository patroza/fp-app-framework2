/* eslint-disable jest/no-standalone-expect */

import * as J from "@matechs/test-jest"
import { effect as T } from "@matechs/effect"
import { Do } from "fp-ts-contrib/lib/Do"

import * as H from "./helpers.spec"
import { RecordNotFound } from "@fp-app/framework"
import { O } from "@fp-app/fp-ts-extensions"

// Test is the same for happy CreateTrainTrip path
export const DeleteTrainTripSpec = J.testM(
  "DeleteTrainTrip",
  Do(T.effect)
    .bind("noneTrainTrip", H.checkError(H.deleteTrainTrip("some-id")))
    .bind("trainTripId", H.createDefaultTrip)
    .bindL("deletionResult", ({ trainTripId }) => H.deleteTrainTrip(trainTripId))
    .bind("trainTripAfter", H.getTrainTripO("some-id"))
    .return(({ deletionResult, noneTrainTrip, trainTripAfter }) => {
      expect(noneTrainTrip).toBeInstanceOf(RecordNotFound)
      expect(deletionResult).toEqual(void 0)
      expect(O.isNone(trainTripAfter)).toBe(true)
    }),
)
