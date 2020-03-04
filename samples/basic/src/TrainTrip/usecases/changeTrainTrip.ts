import {
  combineValidationErrors,
  createCommandWithDeps,
  DbError,
  ForbiddenError,
  InvalidStateError,
  toFieldError,
  ValidationError,
} from "@fp-app/framework"
import { pipe, E, TE } from "@fp-app/fp-ts-extensions"
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
    TE.compose(
      TE.chainTup(pipe(validateStateProposition, _.liftE, E.toTaskEither)),
      TE.chainFlatTup(
        TE.compose(
          TE.map(([, i]) => i.trainTripId),
          TE.chain(pipe(db.trainTrips.load, _.liftTE)),
        ),
      ),
      TE.chain(
        ([trainTrip, proposal]) =>
          pipe(trainTrip.proposeChanges, _.liftE, E.toTaskEither, f => f(proposal)),
        // ALT1
        // TE.compose(
        //   TE.map(
        //     ([trainTrip, proposal]) =>
        //       [pipe(trainTrip.proposeChanges, _.liftE, E.toTaskEither), proposal] as const,
        //   ),
        //   TE.chain(([proposeChanges, trainTripId]) => proposeChanges(trainTripId)),
        // ),
        // ALT2
        //{
        //  const proposeChanges = pipe(trainTrip.proposeChanges, _.liftE, E.toTaskEither)
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
    E.resultTuple(
      pipe(
        E.valueOrUndefined(travelClass, TravelClassDefinition.create),
        E.mapLeft(toFieldError("travelClass")),
      ),
      pipe(
        E.valueOrUndefined(startDate, FutureDate.create),
        E.mapLeft(toFieldError("startDate")),
      ),
      pipe(
        E.valueOrUndefined(pax, PaxDefinition.create),
        E.mapLeft(toFieldError("pax")),
      ),
      // E.ok(rest),
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
