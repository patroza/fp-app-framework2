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
      //   // TODO: Finish the domain event handlers.
      //   const eventHandler = new DomainEventHandler(
      //     (evt) =>
      //       TE.tryCatch(
      //         () => T.runToPromise(T.provideAll(env)(PreCommit.handlers(evt as any))),
      //         (err) => err as Error,
      //       ),
      //     (evt) =>
      //       TE.tryCatch(
      //         () => T.runToPromise(T.provideAll(env)(PostCommit.handlers(evt as any))),
      //         (err) => err as Error,
      //       ),
      //   )
      const trainTrips = TTC.trainTrips()
      return DiskDBContext({
        // // TODO
        // // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eventHandler: eventHandler as any,
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
