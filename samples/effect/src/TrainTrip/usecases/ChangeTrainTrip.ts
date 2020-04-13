import {
  combineValidationErrors,
  toFieldError,
  ValidationError,
  FieldValidationError,
  RecordNotFound,
} from "@fp-app/framework"
import { pipe, E, NA, t, toVoid, O } from "@fp-app/fp-ts-extensions"
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

const ChangeTrainTrip = (input: Input) =>
  Do(T.effect)
    .bind("proposal", pipe(validateStateProposition(input), T.fromEither))
    .bindL("trainTrip", ({ proposal }) =>
      pipe(
        TC.load(proposal.trainTripId),
        // "wrap"
        T.chain(
          O.fold(
            () => T.raiseError(new RecordNotFound("trainTrip", proposal.trainTripId)),
            (x) => T.pure(x) as T.Effect<unknown, RecordNotFound, TrainTrip>,
          ),
        ),
      ),
    )
    .doL(({ proposal, trainTrip }) =>
      pipe(trainTrip.proposeChanges(proposal), T.fromEither),
    )
    .do(TC.save())
    .return(toVoid)

export default ChangeTrainTrip

export const Input = t.type(
  {
    trainTripId: t.NonEmptyString,
    pax: t.union([Pax, t.undefined]),
    startDate: t.union([t.DateFromISOString, t.undefined]),
    travelClass: t.union([t.NonEmptyString, t.undefined]),
  },
  "GetTrainTripInput",
)
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Input extends t.TypeOf<typeof Input> {}

export const validatePrimitives = createPrimitiveValidator<Input, typeof Input>(Input)

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
    t.NonEmptyString.decode,
    E.mapLeft((err) => new ValidationError(err.map((x) => x.message).join(","))),
  )(id)