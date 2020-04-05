import {
  combineValidationErrors,
  createCommandWithDeps,
  DbError,
  ForbiddenError,
  InvalidStateError,
  toFieldError,
  ValidationError,
  FieldValidationError,
} from "@fp-app/framework"
import { pipe, E, NA, t, TE } from "@fp-app/fp-ts-extensions"
import { trainTrips } from "@/TrainTrip/infrastructure/TrainTripContext.disk"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { defaultDependencies } from "./types"
import { Do } from "fp-ts-contrib/lib/Do"
import { getMonoid } from "fp-ts/lib/Array"
import { wrap } from "../infrastructure/utils"
import { flow } from "fp-ts/lib/function"

const createCommand = createCommandWithDeps(() => ({
  trainTrips,
  ...defaultDependencies,
}))

const changeTrainTrip = createCommand<Input, void, ChangeTrainTripError>(
  "changeTrainTrip",
  ({ _, trainTrips }) => (input) =>
    Do(TE.taskEither)
      .bind(
        "proposal",
        pipe(validateStateProposition, _.RE.liftErr, E.toTaskEither)(input),
      )
      .bindL("trainTrip", ({ proposal }) =>
        pipe(wrap(trainTrips.load), _.RTE.liftErr)(proposal.trainTripId),
      )
      .doL(({ proposal, trainTrip }) =>
        pipe(trainTrip.proposeChanges, _.RE.liftErr, E.toTaskEither)(proposal),
      )
      .return(() => void 0 as void),

  // ALT1
  // compose(
  //   map(
  //     ([trainTrip, proposal]) =>
  //       tuple(pipe(trainTrip.proposeChanges, _.RE.liftErr, E.toTaskEither), proposal),
  //   ),
  //   chain(([proposeChanges, trainTripId]) => proposeChanges(trainTripId)),
  // ),
  // ALT2
  //{
  //  const proposeChanges = pipe(trainTrip.proposeChanges, _.RE.liftErr, E.toTaskEither)
  //  return proposeChanges(proposal)
  //}
)
export default changeTrainTrip

export interface Input extends StateProposition {
  trainTripId: string
}

export interface StateProposition {
  pax?: Pax
  startDate?: Date
  travelClass?: string
}

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

type ChangeTrainTripError =
  | ForbiddenError
  | InvalidStateError
  | ValidationError
  | DbError
