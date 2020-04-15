import {
  combineValidationErrors,
  toFieldError,
  FieldValidationError,
} from "@fp-app/framework"
import { pipe, E, NA, t } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { Do } from "fp-ts-contrib/lib/Do"
import { getMonoid } from "fp-ts/lib/Array"
import { T, liftEitherSuspended } from "@e/meffect"
import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"
import TrainTrip from "../TrainTrip"
import { createPrimitiveValidator } from "@e/utils"
import * as STT from "../infrastructure/saveTrainTrip"
import { O } from "ts-toolbelt"

const ChangeTrainTrip = (input: Input) =>
  T.asUnit(
    Do(T.effect)
      .bind("proposal", pipe(input, liftEitherSuspended(validateStateProposition)))
      .bindL("trainTrip", ({ proposal }) => TC.loadE(proposal.trainTripId))
      .bindL("result", ({ proposal, trainTrip }) =>
        pipe(trainTrip, TrainTrip.proposeChanges(proposal), T.fromEither),
      )
      .doL(({ result: [tt, evt] }) => STT.save(tt, evt))
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
export interface Input
  extends O.Optional<
    t.TypeOf<typeof Input>,
    "pax" | "startDate" | "travelClass" | "locked"
  > {}

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
        trainTripId: E.right(trainTripId),
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
