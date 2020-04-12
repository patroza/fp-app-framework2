import { effect as T, managed as M, exit as E } from "@matechs/effect"
import * as KOA from "@matechs/koa"
// import { Do } from "fp-ts-contrib/lib/Do"
import { pipe } from "fp-ts/lib/pipeable"
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

const port = 3535

const program = pipe(
  sequenceT(T.effect)(
    mainR,
    //subR,
    KOA.middleware((ctx, next) => {
      ctx.set("X-Request-Id", "my-id")
      return next()
    }),
  ),
  // keep process waiting
  T.chainTap(() => T.never),
  M.provideS(KOA.managedKoa(port)),
  T.fork,
)

T.run(
  pipe(program, KOA.provideKoa) /* RM.provideRandomMessage,  */,
  E.fold(
    (server) => {
      console.log(`Listening on port ${port}`)
      process.on("SIGINT", () => {
        T.runToPromise(server.interrupt).then(({ error }) => {
          process.exit(error ? 2 : 0)
        })
      })
      process.on("SIGTERM", () => {
        T.runToPromise(server.interrupt).then(({ error }) => {
          process.exit(error ? 2 : 0)
        })
      })
    },
    (e) => console.error(e),
    (e) => console.error(e),
    () => console.error("interrupted"),
  ),
)
