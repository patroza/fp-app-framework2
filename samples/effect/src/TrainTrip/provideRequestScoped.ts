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

  // TODO: use provide `flow()`...
  const env = {
    [RC.contextEnv]: {
      get ctx() {
        return readContext.value
      },
    },
    [TTC.contextEnv]: {
      get ctx() {
        return ctx.value
      },
    },
  } as RC.RCContext & TTC.TTCContext
  return combineProviders()
    .with(TTC.provideTrainTripContext)
    .with(RC.provideReadContext)
    .with(T.provide(env))
    .done()
}

export default provideRequestScoped
