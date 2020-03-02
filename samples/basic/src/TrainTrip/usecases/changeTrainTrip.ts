import {
  combineValidationErrors,
  createCommandWithDeps,
  DbError,
  ForbiddenError,
  InvalidStateError,
  toFieldError,
  ValidationError,
} from "@fp-app/framework"
import {
  ok,
  resultTuple,
  valueOrUndefined,
  pipe,
  chainTupTask,
  E,
  chainFlatTupTask,
  TE,
  compose,
  toTE,
} from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { DbContextKey, defaultDependencies } from "./types"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  ...defaultDependencies,
})

const changeTrainTrip = createCommand<Input, void, ChangeTrainTripError>(
  "changeTrainTrip",
  ({ _, db }) =>
    compose(
      chainTupTask(pipe(validateStateProposition, _.liftE, toTE)),
      chainFlatTupTask(
        compose(
          TE.map(([, i]) => i.trainTripId),
          TE.chain(pipe(db.trainTrips.load, _.liftTE)),
        ),
      ),
      TE.chain(
        ([trainTrip, proposal]) =>
          pipe(trainTrip.proposeChanges, _.liftE, toTE, f => f(proposal)),
        // ALT1
        // compose(
        //   TE.map(
        //     ([trainTrip, proposal]) =>
        //       [pipe(trainTrip.proposeChanges, _.liftE, toTE), proposal] as const,
        //   ),
        //   TE.chain(([proposeChanges, trainTripId]) => proposeChanges(trainTripId)),
        // ),
        // ALT2
        //{
        //  const proposeChanges = pipe(trainTrip.proposeChanges, _.liftE, toTE)
        //  return proposeChanges(proposal)
        //}
      ),
    ),
)
export default changeTrainTrip

export interface Input extends StateProposition {
  trainTripId: string
}

export interface StateProposition {
  pax?: Pax
  startDate?: string
  travelClass?: string
}

const validateStateProposition = (
  { pax, startDate, travelClass }: StateProposition, // ...rest
) =>
  pipe(
    resultTuple(
      pipe(
        valueOrUndefined(travelClass, TravelClassDefinition.create),
        E.mapLeft(toFieldError("travelClass")),
      ),
      pipe(
        valueOrUndefined(startDate, FutureDate.create),
        E.mapLeft(toFieldError("startDate")),
      ),
      pipe(valueOrUndefined(pax, PaxDefinition.create), E.mapLeft(toFieldError("pax"))),
      // ok(rest),
    ),
    E.mapLeft(combineValidationErrors),
    E.map(([travelClass, startDate, pax]) => ({
      //      ...rest,
      pax,
      startDate,
      travelClass,
    })),
  )

type ChangeTrainTripError =
  | ForbiddenError
  | InvalidStateError
  | ValidationError
  | DbError
