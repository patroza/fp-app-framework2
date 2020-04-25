import {
  combineValidationErrors,
  toFieldError,
  FieldValidationError,
} from "@fp-app/framework"
import { pipe, E, NA, I, IT } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { Do } from "fp-ts-contrib/lib/Do"
import { getMonoid } from "fp-ts/lib/Array"
import { T } from "@e/framework"
import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"
import TrainTrip from "../TrainTrip"
import { createPrimitiveValidator } from "@e/utils"
import * as STT from "../infrastructure/saveTrainTrip"
import { O } from "ts-toolbelt"

const ChangeTrainTrip = (input: Input) =>
  T.asUnit(
    T.Do()
      .bind("proposal", pipe(input, T.liftEither(validateStateProposition)))
      .bindL("trainTrip", ({ proposal }) => TC.loadE(proposal.trainTripId))
      .bindL("result", ({ proposal, trainTrip }) =>
        pipe(trainTrip, TrainTrip.proposeChangesE(proposal)),
      )
      .doL(({ result: [tt, evt] }) => STT.save(tt, evt))
      .done(),
  )

export default ChangeTrainTrip

export const Input = I.type(
  {
    trainTripId: IT.NonEmptyString.NonEmptyString,
    locked: I.union([I.boolean, I.undefined]),
    pax: I.union([Pax, I.undefined]),
    startDate: I.union([IT.DateFromISOString.DateFromISOString, I.undefined]),
    travelClass: I.union([IT.NonEmptyString.NonEmptyString, I.undefined]),
  },
  "GetTrainTripInput",
)
export interface Input
  extends O.Optional<
    I.TypeOf<typeof Input>,
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
