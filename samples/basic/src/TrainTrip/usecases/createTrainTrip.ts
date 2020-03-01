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
  err,
  ok,
  Result,
  resultTuple,
  pipe,
  E,
  TE,
  liftType,
  chainTupTask,
  EDo,
  compose,
  liftE,
  liftTE,
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

const lift = {
  E: liftE<CreateError>(),
  TE: liftTE<CreateError>(),
}

const createTrainTrip = createCommand<Input, string, CreateError>(
  "createTrainTrip",
  ({ db, getTrip }) =>
    compose(
      TE.chainEitherK(lift.E(validateCreateTrainTripInfo)),
      chainTupTask(lift.TE(i => getTrip(i.templateId))),
      TE.chain(([trip, proposal]) =>
        TE.fromEither(
          pipe(
            E.right<CreateError, TrainTrip>(TrainTrip.create(proposal, trip)),
            EDo(db.trainTrips.add),
            E.map(trainTrip => trainTrip.id),
          ),
        ),
      ),
    ),
)

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

// TODO
const validateString = <T extends string>(str: string): Result<T, ValidationError> =>
  str ? ok(str as T) : err(new ValidationError("not a valid str"))

type CreateError =
  | CombinedValidationError
  | InvalidStateError
  | ValidationError
  | ApiError
