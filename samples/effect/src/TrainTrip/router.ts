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

const mapErrorToHTTP = T.mapError((err) => {
  if (err instanceof ValidationError) {
    return KOA.routeError(400, err)
  }
  return KOA.routeError(500, err)
})

const getTrainTrip = KOA.route(
  "get",
  "/:trainTripId",
  Do(T.effect)
    // TODO: this somehow makes the error type end up as `unknown` instead of `never`
    // .bindL("input", () => KOA.accessReq((ctx) => ({ id: ctx.params.id })))
    // .bindL("result", ({ input }) => pipe(input, T.chain(GetTrainTrip)))
    .bind(
      "result",
      pipe(
        KOA.accessReq((ctx) => ({ trainTripId: ctx.params.trainTripId })),
        T.chain(GetTrainTrip),
      ),
    )
    .return(({ result }) =>
      O.isSome(result)
        ? KOA.routeResponse(200, result.value)
        : KOA.routeResponse(404, null),
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
  ),
)

const routes = sequenceT(T.effect)(createTrainTrip, getTrainTrip)

const router = pipe(routes, KOA.withSubRouter("/train-trip"))

export default router
