import {
  combineValidationErrors,
  toFieldError,
  FieldValidationError,
} from "@fp-app/framework"
import { Do, pipe, E, NA, I, IT } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TrainTrip from "../TrainTrip"
import * as API from "@e/TrainTrip/infrastructure/api"
import { getMonoid } from "fp-ts/lib/Array"
import { T } from "@e/framework"
import { createPrimitiveValidator } from "@e/utils"
import save from "../infrastructure/saveTrainTrip"

const CreateTrainTrip = (input: Input) =>
  T.Do()
    .bind("preferences", pipe(input, T.liftEither(validateCreateTrainTripInfo)))
    .bindL("trip", ({ preferences }) => API.get(preferences.templateId))
    // TODO: new Date, should be a date service.. // T.sync(() => new Date())
    .letL("result", ({ preferences, trip }) =>
      TrainTrip.create(trip, preferences, new Date()),
    )
    // TODO: save should occur automatically as part of succeeding command requests.. or not?
    .bindL("updatedTrainTrip", ({ result: [tt, evts] }) => save(tt, evts, "add"))
    .return((r) => r.updatedTrainTrip.id)

export default CreateTrainTrip

export const Input = I.type(
  {
    templateId: IT.NonEmptyString.NonEmptyString,
    pax: Pax,
    startDate: IT.DateFromISOString.DateFromISOString,
  },
  "GetTrainTripInput",
)
export interface Input extends I.TypeOf<typeof Input> {}

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
