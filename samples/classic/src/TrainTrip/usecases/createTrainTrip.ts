import {
  ApiError,
  CombinedValidationError,
  combineValidationErrors,
  InvalidStateError,
  toFieldError,
  ValidationError,
  FieldValidationError,
} from "@fp-app/framework"
import { Do, Result, pipe, E, NA, TE } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TrainTrip from "../TrainTrip"
import { getTrip } from "@c/TrainTrip/infrastructure/api"
import { defaultDependencies } from "./types"
import { trainTrips } from "@c/TrainTrip/infrastructure/TrainTripContext.disk"
import { getMonoid } from "fp-ts/lib/Array"
import { createCommandWithDeps } from "@fp-app/framework-classic"

const createCommand = createCommandWithDeps(() => ({
  getTrip,
  trainTrips,
  ...defaultDependencies,
}))

const createTrainTrip = createCommand<Input, string, CreateError>(
  "createTrainTrip",
  ({ _, getTrip, trainTrips }) => (input) =>
    TE.Do()
      .bind(
        "preferences",
        pipe(input, pipe(validateCreateTrainTripInfo, _.RE.liftErr, E.toTaskEither)),
      )
      .bindL("trip", ({ preferences }) => getTrip(preferences.templateId))
      .letL("trainTrip", ({ preferences, trip }) =>
        TrainTrip.create(trip, preferences, new Date()),
      )
      .doL(({ trainTrip }) => pipe(trainTrips.add(trainTrip), TE.right))
      .return(({ trainTrip }) => trainTrip.id),
)

export default createTrainTrip
export interface Input {
  templateId: string
  pax: Pax
  startDate: Date
}

const validateCreateTrainTripInfo = ({ pax, startDate, templateId }: Input) =>
  pipe(
    Do(E.getValidation(getMonoid<FieldValidationError>()))
      .sequenceS({
        pax: pipe(
          PaxDefinition.create(pax),
          E.mapLeft(toFieldError("pax")),
          E.mapLeft(NA.of),
        ),
        startDate: pipe(
          FutureDate.create(startDate),
          E.mapLeft(toFieldError("startDate")),
          E.mapLeft(NA.of),
        ),
        templateId: pipe(
          validateString(templateId),
          E.mapLeft(toFieldError("templateId")),
          E.mapLeft(NA.of),
        ),
      })
      .done(),
    E.mapLeft(combineValidationErrors),
  )

// TODO
const validateString = <T extends string>(str: string): Result<T, ValidationError> =>
  str ? E.ok(str as T) : E.err(new ValidationError("not a valid str"))

type CreateError =
  | CombinedValidationError
  | InvalidStateError
  | ValidationError
  | ApiError
