import { effect as T } from "@matechs/effect"
import TrainTripReadContext, * as RC from "./infrastructure/TrainTripReadContext.disk"
import DiskDBContext, * as TTC from "./infrastructure/TrainTripContext.disk"
import { createLazy } from "@fp-app/framework/src/utils"
import { combineProviders } from "@matechs/prelude"

const provideRequestScoped = () => {
  const readContext = createLazy(() => new TrainTripReadContext())
  const ctx = createLazy(() => {
    const trainTrips = TTC.trainTrips()
    return DiskDBContext({
      readContext: readContext.value,
      trainTrips,
    })
  })

  const provideRCContext = T.provide<RC.RCContext>({
    [RC.contextEnv]: {
      get ctx() {
        return readContext.value
      },
    },
  })

  const provideTTCContext = T.provide<TTC.TTCContext>({
    [TTC.contextEnv]: {
      get ctx() {
        return ctx.value
      },
    },
  })

  return combineProviders()
    .with(TTC.provideTrainTripContext)
    .with(RC.provideReadContext)
    .with(provideRCContext)
    .with(provideTTCContext)
    .done()
}

export default provideRequestScoped
