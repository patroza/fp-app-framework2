import {
  combineValidationErrors,
  toFieldError,
  ValidationError,
  FieldValidationError,
} from "@fp-app/framework"
import { Do, Result, pipe, E, NA, t } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TrainTrip from "../TrainTrip"
import * as API from "@e/TrainTrip/infrastructure/api"
import { getMonoid } from "fp-ts/lib/Array"
import { T, liftEitherSuspended } from "@e/meffect"
import { createPrimitiveValidator } from "@e/utils"
import save from "../infrastructure/saveTrainTrip"

const CreateTrainTrip = (input: Input) =>
  Do(T.effect)
    .bind("preferences", liftEitherSuspended(validateCreateTrainTripInfo)(input))
    .bindL("trip", ({ preferences }) => API.get(preferences.templateId))
    // TODO: new Date, should be a date service.. // T.sync(() => new Date())
    .letL("result", ({ preferences, trip }) =>
      TrainTrip.create(trip, preferences, new Date()),
    )
    // TODO: save should occur automatically as part of succeeding command requests.. or not?
    .bindL("updatedTrainTrip", ({ result: [tt, evts] }) => save(tt, evts, "add"))
    .return((r) => r.updatedTrainTrip.id)

export default CreateTrainTrip

export const Input = t.type(
  {
    templateId: t.NonEmptyString,
    pax: Pax,
    startDate: t.DateFromISOString,
  },
  "GetTrainTripInput",
)
export interface Input extends t.TypeOf<typeof Input> {}

export const validatePrimitives = createPrimitiveValidator<Input, typeof Input>(Input)

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
