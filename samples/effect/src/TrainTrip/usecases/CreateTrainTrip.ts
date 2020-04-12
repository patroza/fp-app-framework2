import {
  combineValidationErrors,
  toFieldError,
  ValidationError,
  FieldValidationError,
} from "@fp-app/framework"
import { Do, Result, pipe, E, NA, t, decodeErrors } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TrainTrip from "../TrainTrip"
import { get } from "@/TrainTrip/infrastructure/api"
import { getMonoid } from "fp-ts/lib/Array"
import { T } from "@/meffect"
import * as TC from "@/TrainTrip/infrastructure/TrainTripContext.disk"

const CreateTrainTrip = (input: Input) =>
  Do(T.effect)
    .bind("preferences", T.fromEither(validateCreateTrainTripInfo(input)))
    .bindL("trip", ({ preferences }) => get(preferences.templateId))
    // TODO: new Date, should be a date service.. // T.sync(() => new Date())
    .letL("trainTrip", ({ preferences, trip }) =>
      TrainTrip.create(trip, preferences, new Date()),
    )
    .doL(({ trainTrip }) => TC.add(trainTrip))
    // TODO: save should occur automatically as part of succeeding command requests.. or not?
    .do(TC.save())
    .return(({ trainTrip }) => trainTrip.id)

export default CreateTrainTrip

export const validatePrimitives = (input: unknown) =>
  pipe(
    Input.decode(input),
    E.map((x) => x as Input),
    E.mapLeft((x) => new ValidationError(decodeErrors(x))),
  )

export const Input = t.type(
  {
    templateId: t.NonEmptyString,
    pax: Pax,
    startDate: t.DateFromISOString,
  },
  "GetTrainTripInput",
)
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Input extends t.TypeOf<typeof Input> {}

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
