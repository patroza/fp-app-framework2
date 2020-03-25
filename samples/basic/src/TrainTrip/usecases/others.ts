//// Separate endpoint sample; unused.

import {
  createCommandWithDeps,
  ForbiddenError,
  InvalidStateError,
  ValidationError,
  DbError,
} from "@fp-app/framework"
import { pipe, E } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import TravelClassDefinition from "../TravelClassDefinition"
import { defaultDependencies } from "./types"
import { wrap } from "../infrastructure/utils"
import {
  compose,
  chainTup,
  map,
  chain,
  chainFlatTup,
} from "@fp-app/fp-ts-extensions/src/TaskEither"
import { trainTrips } from "@/TrainTrip/infrastructure/TrainTripContext.disk"

const createCommand = createCommandWithDeps({
  trainTrips,
  ...defaultDependencies,
})

export const changeStartDate = createCommand<
  ChangeStartDateInput,
  void,
  ChangeStartDateError
>("changeStartDate", ({ _, trainTrips }) =>
  compose(
    chainTup(
      compose(
        map(i => i.startDate),
        chain(pipe(FutureDate.create, _.RE.liftErr, E.toTaskEither)),
      ),
      // ALT
      // pipe(
      //   FutureDate.create,
      //   _.E.liftErr,
      //   toTE,
      //   mapper(i => i.startDate),
      // ),
    ),
    chainFlatTup(
      compose(
        map(([, i]) => i.trainTripId),
        chain(pipe(wrap(trainTrips.load), _.RTE.liftErr)),
      ),
      // ALT
      // pipe(
      //   trainTrips.load,
      //   _.RTE.liftErr,
      //   mapper(([, i]) => i.trainTripId),
      // ),
    ),
    chain(
      ([trainTrip, startDate]) =>
        pipe(trainTrip.changeStartDate, _.RE.liftErr, E.toTaskEither, f =>
          f(startDate),
        ),
      // ALT
      // pipe(trainTrip.changeStartDate, _.RE.liftErr, toTE)(startDate),
    ),
  ),
)

export interface ChangeStartDateInput {
  trainTripId: string
  startDate: Date
}
type ChangeStartDateError = ValidationError | ForbiddenError | DbError

export const changeTravelClass = createCommand<
  ChangeTravelClassInput,
  void,
  ChangeTravelClassError
>("changeTravelClass", ({ _, trainTrips }) =>
  compose(
    chainTup(
      compose(
        map(({ travelClass }) => travelClass),
        chain(pipe(TravelClassDefinition.create, _.RE.liftErr, E.toTaskEither)),
      ),
    ),
    // alt:
    // chainTup(({ travelClass }) =>
    //   pipe(TravelClassDefinition.create, _.RE.liftErr, E.toTaskEither)(travelClass),
    // ),
    // alt2:
    // chainTup(({ travelClass }) => {
    //   const createTravelClassDefinition = pipe(TravelClassDefinition.create, _.RE.liftErr, E.toTaskEither)
    //   return createTravelClassDefinition(travelClass),
    // }),
    chainFlatTup(
      compose(
        map(([, i]) => i.trainTripId),
        chain(pipe(wrap(trainTrips.load), _.RTE.liftErr)),
      ),
    ),
    // I want to write this as: map([, i] => i.trainTripid), chain(trainTrips.load§)
    // chainFlatTup(_.RTE.liftErr(([, i]) => trainTrips.load(i.trainTripId))),
    // This means:
    // chain(input => {
    //   const load = _.RTE.liftErr(trainTrips.load)
    //   const f = ([, i]: typeof input) => load(i.trainTripId)
    //   return pipe(
    //     f(input),
    //     map(x => tuple(x, input[0], input[1])),
    //   )
    // }),
    chain(([trainTrip, sl]) => {
      const changeTravelClass = pipe(
        trainTrip.changeTravelClass,
        _.RE.liftErr,
        E.toTaskEither,
      )
      return changeTravelClass(sl)
    }),
  ),
)

export interface ChangeTravelClassInput {
  trainTripId: string
  travelClass: TravelClassDefinition
}
type ChangeTravelClassError =
  | ForbiddenError
  | InvalidStateError
  | ValidationError
  | DbError
