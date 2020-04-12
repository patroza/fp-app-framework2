import { effect as T } from "@matechs/effect"
import * as KOA from "@matechs/koa"
import * as O from "fp-ts/lib/Option"
// import { Do } from "fp-ts-contrib/lib/Do"
import { sequenceT } from "fp-ts/lib/Apply"
import { pipe } from "fp-ts/lib/pipeable"
import { Do } from "fp-ts-contrib/lib/Do"
import * as GetTrainTrip from "./usecases/GetTrainTrip"
import * as CreateTrainTrip from "./usecases/CreateTrainTrip"
import { ValidationError } from "@fp-app/framework"
import * as RC from "./infrastructure/TrainTripReadContext.disk"
import { E, decodeErrors } from "@fp-app/fp-ts-extensions"
import { joinData, mapErrorToHTTP } from "@/requestHelpers"

// TODO: Without all the hussle..
export const provideRequestScoped = <R, E, A>(
  i: T.Effect<R & RC.HasReadContext, E, A>,
): T.Effect<T.Erase<R, RC.HasReadContext>, E, A> =>
  T.provideR((r: R) => ({
    ...r,
    ...RC.env,
  }))(i)

const getTrainTrip = KOA.route(
  "get",
  "/:trainTripId",
  pipe(
    Do(T.effect)
      .bindL("input", () =>
        KOA.accessReqM((ctx) =>
          pipe(validateGetTrainTripInput(joinData(ctx)), T.fromEither),
        ),
      )
      .bindL("result", ({ input }) => GetTrainTrip.default(input))
      .return(({ result }) =>
        O.isSome(result)
          ? KOA.routeResponse(200, result.value)
          : KOA.routeResponse(404, null),
      ),
    mapErrorToHTTP,
    provideRequestScoped,
  ),
)

const validateGetTrainTripInput = (input: unknown) =>
  pipe(
    GetTrainTrip.Input.decode(input),
    E.map((x) => x as GetTrainTrip.Input),
    E.mapLeft((x) => new ValidationError(decodeErrors(x))),
  )

const createTrainTrip = KOA.route(
  "post",
  "/",
  pipe(
    Do(T.effect)
      .bind(
        "result",
        pipe(
          KOA.accessReqM((ctx) =>
            pipe(validateCreateTrainTripInput(joinData(ctx)), T.fromEither),
          ),
          T.chain(CreateTrainTrip.default),
        ),
      )
      .return(({ result }) => KOA.routeResponse(200, result)),
    mapErrorToHTTP,
    provideRequestScoped,
  ),
)

const validateCreateTrainTripInput = (input: unknown) =>
  pipe(
    CreateTrainTrip.Input.decode(input),
    E.map((x) => x as CreateTrainTrip.Input),
    E.mapLeft((x) => new ValidationError(decodeErrors(x))),
  )

const routes = sequenceT(T.effect)(createTrainTrip, getTrainTrip)

const router = pipe(routes, KOA.withSubRouter("/train-trip"))

export default router
