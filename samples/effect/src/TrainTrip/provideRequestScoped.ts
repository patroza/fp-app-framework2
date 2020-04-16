import { effect as T } from "@matechs/effect"
import TrainTripReadContext, * as RC from "./infrastructure/TrainTripReadContext.disk"
import DiskDBContext, * as TTC from "./infrastructure/TrainTripContext.disk"
import { createLazy } from "@fp-app/framework/src/utils"
import * as API from "./infrastructure/api"
import * as TTP from "./infrastructure/trainTripPublisher.inMemory"

// TODO: Without all the hustle..
const provideRequestScoped = <R, E, A>(
  i: T.Effect<R & RC.ReadContext & TTC.TrainTripContext, E, A>,
): T.Effect<
  T.Erase<R, RC.ReadContext & TTC.TrainTripContext> &
    API.TripApi &
    TTP.TrainTripPublisher,
  E,
  A
> =>
  T.provideR((r: R & TTP.TrainTripPublisher & API.TripApi) => {
    const readContext = createLazy(() => new TrainTripReadContext())
    const ctx = createLazy(() => {
      const trainTrips = TTC.trainTrips()
      return DiskDBContext({
        readContext: readContext.value,
        trainTrips,
      })
    })

    const env = {
      ...r,
      [RC.contextEnv]: {
        get ctx() {
          return readContext.value
        },
      },
      ...RC.env,
      [TTC.contextEnv]: {
        get ctx() {
          return ctx.value
        },
      },
      ...TTC.env,
      // TODO: Mess; reason being that the implementation has an accessor of other R's, but the requestors will receive it preconfigured :S
    } as R &
      TTP.TrainTripPublisher &
      API.TripApi &
      RC.ReadContext &
      TTC.TrainTripContext
    return env
  })(i)

export default provideRequestScoped
