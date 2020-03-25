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
import { Result, pipe, E, NA } from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TrainTrip from "../TrainTrip"
import { DbContextKey, defaultDependencies, getTripKey } from "./types"
import { sequenceT } from "fp-ts/lib/Apply"
import {
  compose,
  chainEitherK,
  chainTup,
  exec,
  map,
} from "@fp-app/fp-ts-extensions/src/TaskEither"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  getTrip: getTripKey,
  ...defaultDependencies,
})

const createTrainTrip = createCommand<Input, string, CreateError>(
  "createTrainTrip",
  ({ _, db, getTrip }) =>
    compose(
      chainEitherK(pipe(validateCreateTrainTripInfo, _.RE.liftErr)),
      chainTup(pipe(getTripFromTrainTripInfo(getTrip), _.RTE.liftErr)),
      // pipe(
      //   getTrip,
      //   mapper((i: { templateId: string }) => i.templateId),
      //   _.TE.liftErr,
      // ),
      // ALT
      //i => pipe(getTrip, _.TE.liftErr)(i.templateId),
      // ALT1
      //pipe(mapper((i: { templateId: string }) => i.templateId)(getTrip), _.TE.liftErr),
      // ALT2
      // const getTripFromTrainTripInfo = (getTrip: typeof getTripKey) => (i: {
      //   templateId: string
      // }) => getTrip(i.templateId)
      // ALT3
      // compose(
      //   map(i => i.templateId),
      //   chain(pipe(getTrip, _.TE.liftErr)),
      // ),
      map(([trip, preferences]) => TrainTrip.create(trip, preferences, new Date())),
      exec(db.trainTrips.add),
      map(trainTrip => trainTrip.id),
    ),
)

const getTripFromTrainTripInfo = (getTrip: typeof getTripKey) => (i: ValidatedInput) =>
  getTrip(i.templateId)

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

type ValidatedInput = E.RightArg<ReturnType<typeof validateCreateTrainTripInfo>>

// TODO
const validateString = <T extends string>(str: string): Result<T, ValidationError> =>
  str ? E.ok(str as T) : E.err(new ValidationError("not a valid str"))

type CreateError =
  | CombinedValidationError
  | InvalidStateError
  | ValidationError
  | ApiError
