import p from "../src/server"
import { effect as T, managed as M, exit as E } from "@matechs/effect"
import * as KOA from "@matechs/koa"
// import { Do } from "fp-ts-contrib/lib/Do"
import { pipe } from "fp-ts/lib/pipeable"
import * as RC from "@/TrainTrip/infrastructure/TrainTripReadContext.disk"
import * as TC from "@/TrainTrip/infrastructure/TrainTripContext.disk"
import * as TA from "@/TrainTrip/infrastructure/api"

const port = 3535

const program = pipe(
  p,
  // keep process waiting
  T.chainTap(() => T.never),
  M.provideS(KOA.managedKoa(port)),
  T.fork,
)

T.run(
  pipe(
    program,
    KOA.provideKoa,
    TA.provideTripApi,
    TC.provideTrainTripContext,
    RC.provideReadContext,
  ),
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
