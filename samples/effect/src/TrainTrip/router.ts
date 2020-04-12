import { effect as T } from "@matechs/effect"
import * as KOA from "@matechs/koa"
import * as O from "fp-ts/lib/Option"
// import { Do } from "fp-ts-contrib/lib/Do"
import { sequenceT } from "fp-ts/lib/Apply"
import { pipe } from "fp-ts/lib/pipeable"
import { Do } from "fp-ts-contrib/lib/Do"
import GetTrainTrip from "./usecases/GetTrainTrip"
import CreateTrainTrip from "./usecases/CreateTrainTrip"
import { ValidationError } from "@fp-app/framework"
import * as RC from "./infrastructure/TrainTripReadContext.disk"
import { HasTripApi } from "./infrastructure/api"
import { HasTrainTripContext } from "./infrastructure/TrainTripContext.disk"

const mapErrorToHTTP = T.mapError((err) => {
  if (err instanceof ValidationError) {
    return KOA.routeError(400, err)
  }
  return KOA.routeError(500, err)
})

// TODO: Without all the hussle..
const provideRequestScoped = <R, E, A>(
  i: T.Effect<R, E, A>,
): T.Effect<T.Erase<R, RC.HasReadContext>, E, A> =>
  T.provideS((r: HasTripApi & HasTrainTripContext) => ({
    ...r,
    ...RC.env,
  }))(i)

const getTrainTrip = KOA.route(
  "get",
  "/:trainTripId",
  pipe(
    Do(T.effect)
      .bindL("input", () =>
        KOA.accessReq((ctx) => ({ trainTripId: ctx.params.trainTripId })),
      )
      .bindL("result", ({ input }) => GetTrainTrip(input))
      .return(({ result }) =>
        O.isSome(result)
          ? KOA.routeResponse(200, result.value)
          : KOA.routeResponse(404, null),
      ),
    provideRequestScoped,
  ),
)

const createTrainTrip = KOA.route(
  "post",
  "/",
  pipe(
    Do(T.effect)
      .bind(
        "result",
        pipe(
          KOA.accessReq((ctx) => ctx.request.body),
          T.chain(CreateTrainTrip),
        ),
      )
      .return(({ result }) => KOA.routeResponse(200, result)),
    mapErrorToHTTP,
    provideRequestScoped,
  ),
)

const routes = sequenceT(T.effect)(createTrainTrip, getTrainTrip)

const router = pipe(routes, KOA.withSubRouter("/train-trip"))

export default router
