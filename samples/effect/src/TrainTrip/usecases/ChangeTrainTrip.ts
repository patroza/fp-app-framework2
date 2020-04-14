import {
  combineValidationErrors,
  toFieldError,
  ValidationError,
  FieldValidationError,
} from "@fp-app/framework"
import { pipe, E, NA, t } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { Do } from "fp-ts-contrib/lib/Do"
import { getMonoid } from "fp-ts/lib/Array"
import { flow } from "fp-ts/lib/function"
import { T } from "@/meffect"
import * as TC from "@/TrainTrip/infrastructure/TrainTripContext.disk"
import TrainTrip from "../TrainTrip"
import { createPrimitiveValidator } from "@/utils"
import { saveT } from "../infrastructure/saveTrainTrip"

const ChangeTrainTrip = (input: Input) =>
  T.asUnit(
    Do(T.effect)
      .bind("proposal", pipe(validateStateProposition(input), T.fromEither))
      .bindL("trainTrip", ({ proposal }) => TC.loadE(proposal.trainTripId))
      .bindL("result", ({ proposal, trainTrip }) =>
        pipe(TrainTrip.proposeChanges(trainTrip)(proposal), T.fromEither),
      )
      .doL(({ result }) => saveT(result))
      .done(),
  )

export default ChangeTrainTrip

export const Input = t.type(
  {
    trainTripId: t.NonEmptyString,
    locked: t.union([t.boolean, t.undefined]),
    pax: t.union([Pax, t.undefined]),
    startDate: t.union([t.DateFromISOString, t.undefined]),
    travelClass: t.union([t.NonEmptyString, t.undefined]),
  },
  "GetTrainTripInput",
)
export interface Input extends t.TypeOf<typeof Input> {}

export const validatePrimitives = createPrimitiveValidator<Input, typeof Input>(Input)

const validateStateProposition = ({
  locked,
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
      .return((r) => ({ ...r, locked })),
    E.mapLeft(combineValidationErrors),
  )

const validateId = (id: string) =>
  flow(
    // eslint-disable-next-line @typescript-eslint/unbound-method
    t.NonEmptyString.decode,
    E.mapLeft((err) => new ValidationError(err.map((x) => x.message).join(","))),
  )(id)
