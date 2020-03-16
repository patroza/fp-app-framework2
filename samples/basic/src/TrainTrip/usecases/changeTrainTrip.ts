import {
  combineValidationErrors,
  createCommandWithDeps,
  DbError,
  ForbiddenError,
  InvalidStateError,
  toFieldError,
  ValidationError,
  FieldValidationError,
} from "@fp-app/framework"
import { pipe, E, NA, t } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { DbContextKey, defaultDependencies } from "./types"
import { sequenceT } from "fp-ts/lib/Apply"
import { wrap } from "../infrastructure/utils"
import { flow } from "fp-ts/lib/function"
import { compose, chain, chainTup, map } from "@fp-app/fp-ts-extensions/src/TaskEither"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  ...defaultDependencies,
})

const changeTrainTrip = createCommand<Input, void, ChangeTrainTripError>(
  "changeTrainTrip",
  ({ _, db }) =>
    compose(
      chain(pipe(validateStateProposition, _.RE.liftErr, E.toTaskEither)),
      chainTup(
        compose(
          map(i => i.trainTripId),
          chain(pipe(wrap(db.trainTrips.load), _.RTE.liftErr)),
        ),
      ),
      chain(([trainTrip, proposal]) =>
        pipe(trainTrip.proposeChanges, _.RE.liftErr, E.toTaskEither, f => f(proposal)),
      ),
      // ALT1
      // compose(
      //   map(
      //     ([trainTrip, proposal]) =>
      //       tuple(pipe(trainTrip.proposeChanges, _.RE.liftErr, E.toTaskEither), proposal),
      //   ),
      //   chain(([proposeChanges, trainTripId]) => proposeChanges(trainTripId)),
      // ),
      // ALT2
      //{
      //  const proposeChanges = pipe(trainTrip.proposeChanges, _.RE.liftErr, E.toTaskEither)
      //  return proposeChanges(proposal)
      //}
    ),
)
export default changeTrainTrip

export interface Input extends StateProposition {
  trainTripId: string
}

export interface StateProposition {
  pax?: Pax
  startDate?: Date
  travelClass?: string
}

const validateStateProposition = ({
  pax,
  startDate,
  trainTripId,
  travelClass,
}: Input) =>
  pipe(
    sequenceT(E.getValidation(NA.getSemigroup<FieldValidationError>()))(
      pipe(
        flow(
          t.NonEmptyString.decode,
          E.mapLeft(err => new ValidationError(err.map(x => x.message).join(","))),
        )(trainTripId),
        E.mapLeft(toFieldError("trainTripId")),
        E.mapLeft(NA.of),
      ),
      pipe(
        E.valueOrUndefined(travelClass, TravelClassDefinition.create),
        E.mapLeft(toFieldError("travelClass")),
        E.mapLeft(NA.of),
      ),
      pipe(
        E.valueOrUndefined(startDate, FutureDate.create),
        E.mapLeft(toFieldError("startDate")),
        E.mapLeft(NA.of),
      ),
      pipe(
        E.valueOrUndefined(pax, PaxDefinition.create),
        E.mapLeft(toFieldError("pax")),
        E.mapLeft(NA.of),
      ),
      // E.ok(rest),
    ),
    E.mapLeft(combineValidationErrors),
    E.map(([trainTripId, travelClass, startDate, pax]) => ({
      trainTripId,
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
