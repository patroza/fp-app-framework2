import {
  ApiError,
  CombinedValidationError,
  combineValidationErrors,
  createCommandWithDeps,
  InvalidStateError,
  toFieldError,
  ValidationError,
} from "@fp-app/framework"
import {
  Result,
  resultTuple,
  pipe,
  E,
  TE,
  reverseApply,
} from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TrainTrip from "../TrainTrip"
import { DbContextKey, defaultDependencies, getTripKey } from "./types"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  getTrip: getTripKey,
  ...defaultDependencies,
})

const createTrainTrip = createCommand<Input, string, CreateError>(
  "createTrainTrip",
  ({ _, db, getTrip }) =>
    TE.compose(
      TE.chainEitherK(pipe(validateCreateTrainTripInfo, _.liftE)),
      TE.chainTup(
        // pipe(
        //   getTrip,
        //   mapper((i: { templateId: string }) => i.templateId),
        //   _.liftTE,
        // ),
        // ALT
        //i => pipe(getTrip, _.liftTE)(i.templateId),
        // ALT1
        //pipe(mapper((i: { templateId: string }) => i.templateId)(getTrip), _.liftTE),
        // ALT2
        pipe(getTripFromTrainTripInfo(getTrip), _.liftTE),
        // const getTripFromTrainTripInfo = (getTrip: typeof getTripKey) => (i: {
        //   templateId: string
        // }) => getTrip(i.templateId)
        // ALT3
        // TE.compose(
        //   TE.map(i => i.templateId),
        //   TE.chain(pipe(getTrip, _.liftTE)),
        // ),
      ),
      TE.map(reverseApply(TrainTrip.create)),
      TE.do(db.trainTrips.add),
      TE.map(trainTrip => trainTrip.id),
    ),
)

const getTripFromTrainTripInfo = (getTrip: typeof getTripKey) => (i: ValidatedInput) =>
  getTrip(i.templateId)

export default createTrainTrip
export interface Input {
  templateId: string
  pax: Pax
  startDate: string
}

// the problem is that the fp-ts compose doesnt return a data last function, but data first ;-)

const validateCreateTrainTripInfo = ({ pax, startDate, templateId }: Input) =>
  pipe(
    resultTuple(
      pipe(PaxDefinition.create(pax), E.mapLeft(toFieldError("pax"))),
      pipe(FutureDate.create(startDate), E.mapLeft(toFieldError("startDate"))),
      pipe(validateString(templateId), E.mapLeft(toFieldError("templateId"))),
    ),
    E.mapLeft(combineValidationErrors),

    E.map(([pax, startDate, templateId]) => ({
      pax,
      startDate,
      templateId,
    })),

    // Alt 1
    // flatMap(input =>
    //   resultTuple3(
    //     input,
    //     ({ pax }) => PaxDefinition.create(pax).compose(mapErr(toFieldError('pax'))),
    //     ({ startDate }) => FutureDate.create(startDate).compose(mapErr(toFieldError('startDate'))),
    //     ({ templateId }) => validateString(templateId).compose(mapErr(toFieldError('templateId'))),
    //   ).mapErr(combineValidationErrors),
    // ),

    // Alt 2
    // Why doesn't this work?
    // flatMap(resultTuple2(
    //   ({pax}) => PaxDefinition.create(pax).compose(mapErr(toFieldError('pax'))),
    //   ({startDate}) => FutureDate.create(startDate).compose(mapErr(toFieldError('startDate'))),
    //   ({templateId}) => validateString(templateId).compose(mapErr(toFieldError('templateId'))),
    // )),
    // mapErr(combineValidationErrors),
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
