import { TrainTripId } from "@/TrainTrip/TrainTrip"
import { utils } from "@fp-app/framework"
import { F, T } from "@/meffect"
import RegisterCloud from "../eventhandlers/RegisterCloud"
import { provideRequestScoped } from "../router"

/**
 * Poor man's queue, great for testing. Do not use in production, or you may loose queued tasks on server restart
 */
export default class TrainTripPublisherInMemory {
  private readonly map = new Map<TrainTripId, NodeJS.Timeout>()
  private readonly logger = utils.getLogger(this.constructor.name)

  registerIfPending = (
    trainTripId: TrainTripId,
    req: <R, E, A>(inp: T.Effect<R, E, A>) => T.Effect<unknown, E, A>,
  ) => {
    if (!this.trainTripIsPending(trainTripId)) {
      return
    }
    return this.register(trainTripId, req)
  }

  register = (
    trainTripId: TrainTripId,
    req: <R, E, A>(inp: T.Effect<R, E, A>) => T.Effect<unknown, E, A>,
  ) => {
    const current = this.map.get(trainTripId)
    if (current) {
      clearTimeout(current)
    }
    this.map.set(
      trainTripId,
      setTimeout(() => {
        this.tryPublishTrainTrip(trainTripId, req)
      }, CLOUD_PUBLISH_DELAY),
    )
  }

  private tryPublishTrainTrip = async (
    trainTripId: string,
    req: <R, E, A>(inp: T.Effect<R, E, A>) => T.Effect<unknown, E, A>,
  ) => {
    try {
      this.logger.log(`Publishing TrainTrip to Cloud: ${trainTripId}: TODO`)
      await T.runToPromise(req(RegisterCloud({ trainTripId })))
    } catch (err) {
      // TODO: really handle error
      this.logger.error(err)
    } finally {
      this.map.delete(trainTripId)
    }
  }

  private trainTripIsPending(trainTripID: TrainTripId) {
    return this.map.has(trainTripID)
  }
}

// export interface IntegrationEventCommands {
//   registerCloud: typeof registerCloud
// }

const CLOUD_PUBLISH_DELAY = 10 * 1000

const TrainTripPublisherURI = "@fp-app/effect/traintrip-publisher"
const TrainTripPublisher_ = F.define({
  [TrainTripPublisherURI]: {
    register: F.fn<(id: string) => T.UIO<void>>(),
    registerIfPending: F.fn<(id: string) => T.UIO<void>>(),
  },
})
export interface TrainTripPublisher extends F.TypeOf<typeof TrainTripPublisher_> {}

export const TrainTripPublisher = F.opaque<TrainTripPublisher>()(TrainTripPublisher_)

export const { register, registerIfPending } = F.access(TrainTripPublisher)[
  TrainTripPublisherURI
]

export const contextEnv = "@fp-app/effect/traintrip-publisher/ctx"

export interface Context {
  [contextEnv]: {
    ctx: TrainTripPublisherInMemory
  }
}

// TODO: This inherits everything from the global scope
// and the current request-scope. It should be fine to pick up
// the current request-id for logging, but otherwise should be new scope
// based on global, and fully new request scope.
// this should also have "all env" as type :/

// what is missing in the global scope providing is the providing for "RegisterCloud"..
// probably should build an own total scope like we do for the Router!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const requestInNewScope = (r: any) => <R, E, A>(inp: T.Effect<R, E, A>) =>
  T.provideS({ ...r })(provideRequestScoped(inp))

export const env = {
  [TrainTripPublisherURI]: {
    register: (id: string) =>
      T.accessM((r: Context) =>
        T.pure(r[contextEnv].ctx.register(id, requestInNewScope(r))),
      ),
    registerIfPending: (id: string) =>
      T.accessM((r: Context) =>
        T.pure(r[contextEnv].ctx.registerIfPending(id, requestInNewScope(r))),
      ),
  },
}
export const provideTrainTripPublisher = F.implement(TrainTripPublisher)(env)
