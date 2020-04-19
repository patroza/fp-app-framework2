import {
  combineValidationErrors,
  toFieldError,
  FieldValidationError,
} from "@fp-app/framework"
import { Do, pipe, E, NA, t } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TrainTrip from "../TrainTrip"
import * as API from "@e/TrainTrip/infrastructure/api"
import { getMonoid } from "fp-ts/lib/Array"
import { T, liftEitherSuspended } from "@e/meffect"
import { createPrimitiveValidator } from "@e/utils"
import save from "../infrastructure/saveTrainTrip"

const CreateTrainTrip = (input: Input) =>
  T.Do()
    .bind("preferences", pipe(input, liftEitherSuspended(validateCreateTrainTripInfo)))
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
        templateId: E.right(templateId),
      })
      .done(),
    E.mapLeft(combineValidationErrors),
  )
