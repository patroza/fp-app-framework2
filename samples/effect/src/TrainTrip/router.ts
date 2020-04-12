import { effect as T } from "@matechs/effect"
import * as KOA from "@matechs/koa"
import * as O from "fp-ts/lib/Option"
// import { Do } from "fp-ts-contrib/lib/Do"
import { sequenceT } from "fp-ts/lib/Apply"
import { pipe } from "fp-ts/lib/pipeable"
import { Do } from "fp-ts-contrib/lib/Do"
import GetTrainTrip from "./usecases/GetTrainTrip"

const getTrainTrip = KOA.route(
  "get",
  "/:trainTripId",
  Do(T.effect)
    // TODO: this somehow makes the error type end up as `unknown` instead of `never`
    //.bindL("input", () => KOA.accessReq((ctx) => ({ id: ctx.params.id })))
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

const router = pipe(sequenceT(T.effect)(getTrainTrip), KOA.withSubRouter("/train-trip"))

export default router
