import { effect as T } from "@matechs/effect"
import * as KOA from "@matechs/koa"
// import { Do } from "fp-ts-contrib/lib/Do"
import { sequenceT } from "fp-ts/lib/Apply"

const routeA = KOA.route(
  "get",
  "/",
  T.pure(
    KOA.routeResponse(200, {
      message: "OK",
    }),
  ),
)

const mainR = sequenceT(T.effect)(routeA)
//const subR = pipe(sequenceT(T.effect)(routeC, routeD), KOA.withSubRouter("/sub"))

const program = sequenceT(T.effect)(
  mainR,
  //subR,
  KOA.middleware((ctx, next) => {
    ctx.set("X-Request-Id", "my-id")
    return next()
  }),
)

export default program
