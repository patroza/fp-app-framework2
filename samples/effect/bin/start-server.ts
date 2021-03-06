import p, { initialize } from "../src/server"
import { effect as T, managed as M, exit as E } from "@matechs/effect"
import * as KOA from "@matechs/koa"
// import { Do } from "fp-ts-contrib/lib/Do"
import { pipe } from "fp-ts/lib/pipeable"
import * as TA from "@e/TrainTrip/infrastructure/api"
import * as TTP from "@e/TrainTrip/infrastructure/trainTripPublisher.inMemory"

const port = 3535

const program = pipe(
  p,
  // keep process waiting
  T.chainTap(() => T.never),
  T.chain(() => T.fromPromise(initialize)),
  M.provide(KOA.managedKoa(port)),
  T.fork,
)

T.run(
  pipe(
    program,
    KOA.provideKoa,
    TA.provideTripApi,
    TTP.provideTrainTripPublisher,
    T.provide<TTP.Context>({
      [TTP.contextEnv]: { ctx: new TTP.default() },
    }),
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
