import {
  ApiError,
  CombinedValidationError,
  combineValidationErrors,
  createCommandWithDeps,
  InvalidStateError,
  toFieldError,
  ValidationError,
  FieldValidationError,
} from "@fp-app/framework"
import { Do, Result, pipe, E, NA, TE } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TrainTrip from "../TrainTrip"
import { getTrip } from "@/TrainTrip/infrastructure/api"
import { defaultDependencies } from "./types"
import { sequenceT } from "fp-ts/lib/Apply"
import { trainTrips } from "@/TrainTrip/infrastructure/TrainTripContext.disk"

const createCommand = createCommandWithDeps(() => ({
  getTrip,
  trainTrips,
  ...defaultDependencies,
}))

const createTrainTrip = createCommand<Input, string, CreateError>(
  "createTrainTrip",
  ({ _, getTrip, trainTrips }) => (input) =>
    Do(TE.taskEither)
      .bind(
        "preferences",
        pipe(input, pipe(validateCreateTrainTripInfo, _.RE.liftErr, E.toTaskEither)),
      )
      .bindL("trip", ({ preferences }) => getTrip(preferences.templateId))
      .letL("trainTrip", ({ preferences, trip }) =>
        TrainTrip.create(trip, preferences, new Date()),
      )
      .letL("", ({ trainTrip }) => trainTrips.add(trainTrip)) // Alternative is: .doL(({ trainTrip }) => TE.right(trainTrips.add(trainTrip)))
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
    sequenceT(E.getValidation(NA.getSemigroup<FieldValidationError>()))(
      pipe(PaxDefinition.create(pax), E.mapLeft(toFieldError("pax")), E.mapLeft(NA.of)),
      pipe(
        FutureDate.create(startDate),
        E.mapLeft(toFieldError("startDate")),
        E.mapLeft(NA.of),
      ),
      pipe(
        validateString(templateId),
        E.mapLeft(toFieldError("templateId")),
        E.mapLeft(NA.of),
      ),
    ),
    E.mapLeft(combineValidationErrors),

    E.map(([pax, startDate, templateId]) => ({
      pax,
      startDate,
      templateId,
    })),
  )

// TODO
const validateString = <T extends string>(str: string): Result<T, ValidationError> =>
  str ? E.ok(str as T) : E.err(new ValidationError("not a valid str"))

type CreateError =
  | CombinedValidationError
  | InvalidStateError
  | ValidationError
  | ApiError
