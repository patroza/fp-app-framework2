import TrainTripReadContext, * as RC from "./infrastructure/TrainTripReadContext.disk"
import DiskDBContext, * as TTC from "./infrastructure/TrainTripContext.disk"
import { combineProviders, M, T } from "@e/framework"

const provideRCContext = T.provideM(
  T.sync(
    () =>
      ({
        [RC.contextEnv]: {
          ctx: new TrainTripReadContext(),
        },
      } as RC.RCContext),
  ),
)

const provideTTCContext = M.provide(
  M.bracket(
    T.accessM((r: RC.RCContext) =>
      T.sync(
        () =>
          ({
            [TTC.contextEnv]: {
              ctx: DiskDBContext({
                readContext: r[RC.contextEnv].ctx,
                trainTrips: TTC.trainTrips(),
              }),
            },
          } as TTC.TTCContext),
      ),
    ),
    (ttc) => T.sync(() => ttc[TTC.contextEnv].ctx.dispose()),
  ),
)

const provideRequestScoped = combineProviders()
  .with(TTC.provideTrainTripContext)
  .with(RC.provideReadContext)
  .with(provideTTCContext)
  .with(provideRCContext)
  .done()

export default provideRequestScoped
