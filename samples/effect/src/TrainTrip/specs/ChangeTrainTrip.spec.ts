/* eslint-disable jest/no-standalone-expect */
import * as J from "@matechs/test-jest"
import { effect as T } from "@matechs/effect"
import { Do } from "fp-ts-contrib/lib/Do"

import * as H from "./helpers.spec"
import { ForbiddenError, ValidationError } from "@fp-app/framework"

export const ChangeStartDate = J.testM(
  "ChangeStartDate",
  Do(T.effect)
    .bind("trainTripId", H.createDefaultTrip)
    .bindL("trainTrip", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .doL(({ trainTripId }) =>
      H.changeTrainTrip({ trainTripId, startDate: "2020-10-01" }),
    )
    .bindL("trainTripAfter", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .return(({ trainTrip, trainTripAfter }) => {
      J.assert.equal(
        trainTrip.startDate,
        "2020-12-01T00:00:00.000Z", // TODO: this is wrong format!
      )
      J.assert.equal(
        trainTripAfter.startDate,
        "2020-10-01T00:00:00.000Z", // TODO: this is wrong format!
      )
    }),
)

export const ChangePax = J.testM(
  "ChangePax",
  Do(T.effect)
    .bind("trainTripId", H.createDefaultTrip)
    .bindL("trainTrip", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .doL(({ trainTripId }) =>
      H.changeTrainTrip({
        trainTripId,
        pax: { adults: 2, children: 0, babies: 0, infants: 0, teenagers: 0 },
      }),
    )
    .bindL("trainTripAfter", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .return(({ trainTrip, trainTripAfter }) => {
      expect(trainTrip.pax).toEqual({
        adults: 0,
        children: 6,
        babies: 0,
        infants: 0,
        teenagers: 0,
      })
      expect(trainTripAfter.pax).toEqual({
        adults: 2,
        children: 0,
        babies: 0,
        infants: 0,
        teenagers: 0,
      })
    }),
)

export const ChangeLocked = J.testM(
  "ChangeLocked",
  Do(T.effect)
    .bind("trainTripId", H.createDefaultTrip)
    .bindL("trainTrip", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .doL(({ trainTripId }) =>
      H.changeTrainTrip({
        trainTripId,
        locked: true,
      }),
    )
    .bindL("trainTripAfter", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .bindL("lockedAfter", ({ trainTripId }) =>
      H.checkError(
        H.changeTrainTrip({
          trainTripId,
          locked: true,
        }),
      ),
    )
    .return(({ lockedAfter, trainTrip, trainTripAfter }) => {
      expect(trainTrip.allowUserModification).toBe(true)
      expect(trainTripAfter.allowUserModification).toBe(false)
      expect(lockedAfter).toBeInstanceOf(ForbiddenError)
    }),
)

export const ChangeTravelClass = J.testM(
  "ChangeTravelClass",
  Do(T.effect)
    .bind("trainTripId", H.createDefaultTrip)
    .bindL("trainTrip", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .bindL("result", ({ trainTripId }) =>
      H.changeTrainTrip({
        trainTripId,
        travelClass: "first",
      }),
    )
    .bindL("trainTripAfter", ({ trainTripId }) => H.getTrainTrip(trainTripId))
    .bindL("invalidInput", ({ trainTripId }) =>
      H.checkError(
        H.changeTrainTrip({
          trainTripId,
          travelClass: "doesnt-exist",
        }),
      ),
    )
    .return(({ invalidInput, result, trainTrip, trainTripAfter }) => {
      expect(trainTrip.travelClass).toEqual("second")
      expect(trainTripAfter.travelClass).toEqual("first")
      expect(invalidInput).toBeInstanceOf(ValidationError)
      expect(result).toBe(void 0)
    }),
)

export const ChangeTrainTripSpec = J.suite("ChangeTrainTrip")(
  ChangeStartDate,
  ChangePax,
  ChangeLocked,
  ChangeTravelClass,
)
