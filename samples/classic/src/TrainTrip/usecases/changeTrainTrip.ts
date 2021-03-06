import {
  combineValidationErrors,
  DbError,
  ForbiddenError,
  InvalidStateError,
  toFieldError,
  ValidationError,
  FieldValidationError,
} from "@fp-app/framework"
import { pipe, E, NA, IT, TE, toVoid } from "@fp-app/fp-ts-extensions"
import { trainTrips } from "@c/TrainTrip/infrastructure/TrainTripContext.disk"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { defaultDependencies } from "./types"
import { Do } from "fp-ts-contrib/lib/Do"
import { getMonoid } from "fp-ts/lib/Array"
import { wrap } from "../infrastructure/utils"
import { flow } from "fp-ts/lib/function"
import { createCommandWithDeps } from "@fp-app/framework-classic"

const createCommand = createCommandWithDeps(() => ({
  trainTrips,
  ...defaultDependencies,
}))

const changeTrainTrip = createCommand<Input, void, ChangeTrainTripError>(
  "changeTrainTrip",
  ({ trainTrips }) => (input) =>
    TE.Do()
      .bind(
        "proposal",
        pipe(
          input,
          validateStateProposition,
          E.liftErr<ChangeTrainTripError>(),
          TE.fromEither,
        ),
      )
      .bindL("trainTrip", ({ proposal }) =>
        pipe(proposal.trainTripId, wrap(trainTrips.load)),
      )
      .doL(({ proposal, trainTrip }) =>
        pipe(proposal, E.liftToTaskEither(trainTrip.proposeChanges)),
      )
      .return(toVoid),
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
    Do(E.getValidation(getMonoid<FieldValidationError>()))
      .sequenceS({
        trainTripId: pipe(
          validateId(trainTripId),
          E.mapLeft(toFieldError("trainTripId")),
          E.mapLeft(NA.of),
        ),
        travelClass: pipe(
          E.valueOrUndefined(travelClass, TravelClassDefinition.create),
          E.mapLeft(toFieldError("travelClass")),
          E.mapLeft(NA.of),
        ),
        startDate: pipe(
          E.valueOrUndefined(startDate, FutureDate.create),
          E.mapLeft(toFieldError("startDate")),
          E.mapLeft(NA.of),
        ),
        pax: pipe(
          E.valueOrUndefined(pax, PaxDefinition.create),
          E.mapLeft(toFieldError("pax")),
          E.mapLeft(NA.of),
        ),
      })
      .done(),
    E.mapLeft(combineValidationErrors),
  )

const validateId = (id: string) =>
  flow(
    // eslint-disable-next-line @typescript-eslint/unbound-method
    IT.NonEmptyString.NonEmptyString.decode,
    E.mapLeft((err) => new ValidationError(err.map((x) => x.message).join(","))),
  )(id)

type ChangeTrainTripError =
  | ForbiddenError
  | InvalidStateError
  | ValidationError
  | DbError
