import {
  combineValidationErrors,
  createCommandWithDeps,
  DbError,
  ForbiddenError,
  InvalidStateError,
  toFieldError,
  ValidationError,
} from "@fp-app/framework"
import {
  ok,
  resultTuple,
  valueOrUndefined,
  pipe,
  chainTupTask,
  E,
  chainFlatTupTask,
  TE,
  compose,
  toTE,
} from "@fp-app/fp-ts-extensions"
import FutureDate from "../FutureDate"
import PaxDefinition, { Pax } from "../PaxDefinition"
import TravelClassDefinition from "../TravelClassDefinition"
import { DbContextKey, defaultDependencies } from "./types"

const createCommand = createCommandWithDeps({
  db: DbContextKey,
  ...defaultDependencies,
})

const changeTrainTrip = createCommand<Input, void, ChangeTrainTripError>(
  "changeTrainTrip",
  ({ db, tools }) => {
    const validate = tools.liftE(validateStateProposition)
    return compose(
      chainTupTask(toTE(validate)),
      chainFlatTupTask(([, i]) => tools.liftTE(db.trainTrips.load)(i.trainTripId)),
      TE.chain(([trainTrip, proposal]) => {
        const proposeChanges = pipe(trainTrip.proposeChanges, tools.liftE, toTE)
        return proposeChanges(proposal)
      }),
    )
  },
)
export default changeTrainTrip

export interface Input extends StateProposition {
  trainTripId: string
}

export interface StateProposition {
  pax?: Pax
  startDate?: string
  travelClass?: string
}

const validateStateProposition = ({
  pax,
  startDate,
  travelClass,
  ...rest
}: StateProposition) =>
  pipe(
    resultTuple(
      pipe(
        valueOrUndefined(travelClass, TravelClassDefinition.create),
        E.mapLeft(toFieldError("travelClass")),
      ),
      pipe(
        valueOrUndefined(startDate, FutureDate.create),
        E.mapLeft(toFieldError("startDate")),
      ),
      pipe(valueOrUndefined(pax, PaxDefinition.create), E.mapLeft(toFieldError("pax"))),
      ok(rest),
    ),
    E.mapLeft(combineValidationErrors),
    E.map(([travelClass, startDate, pax, rest]) => ({
      ...rest,
      pax,
      startDate,
      travelClass,
    })),
  )

type ChangeTrainTripError =
  | ForbiddenError
  | InvalidStateError
  | ValidationError
  | DbError
