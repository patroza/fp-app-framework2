import { effect as T } from "@matechs/effect"
import TrainTripReadContext, * as RC from "./infrastructure/TrainTripReadContext.disk"
import DiskDBContext, * as TTC from "./infrastructure/TrainTripContext.disk"
import { createLazy } from "@fp-app/framework/src/utils"
import { pipe } from "@fp-app/fp-ts-extensions"

const provideRequestScoped = () => <S, R, E, A>(
  i: T.Effect<S, R & RequestScoped, E, A>,
): T.Effect<S, R, E, A> => {
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
  } as RC.Context & TTC.Context
  return pipe(i, TTC.provideTrainTripContext, RC.provideReadContext, T.provide(env))
}

type RequestScoped = RC.ReadContext & TTC.TrainTripContext

export default provideRequestScoped
