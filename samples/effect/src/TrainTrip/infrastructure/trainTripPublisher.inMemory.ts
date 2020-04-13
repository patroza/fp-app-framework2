import { TrainTripId } from "@/TrainTrip/TrainTrip"
import { utils } from "@fp-app/framework"
import { F, T } from "@/meffect"

/**
 * Poor man's queue, great for testing. Do not use in production, or you may loose queued tasks on server restart
 */
export default class TrainTripPublisherInMemory {
  private readonly map = new Map<TrainTripId, NodeJS.Timeout>()
  // TODO: easy way how to inject a configured logger
  // ie the key is 'configuredLogger', and it will be configured based on the
  // function/class.
  private readonly logger = utils.getLogger(this.constructor.name)

  //   constructor(
  //     @paramInject(requestInNewScopeKey) private readonly request: requestInNewScopeType,
  //   ) {}

  registerIfPending = (trainTripId: TrainTripId) => {
    if (!this.trainTripIsPending(trainTripId)) {
      return
    }
    return this.register(trainTripId)
  }

  register = (trainTripId: TrainTripId) => {
    const current = this.map.get(trainTripId)
    if (current) {
      clearTimeout(current)
    }
    this.map.set(
      trainTripId,
      setTimeout(() => {
        this.tryPublishTrainTrip(trainTripId)
      }, CLOUD_PUBLISH_DELAY),
    )
  }

  private tryPublishTrainTrip = async (trainTripId: string) => {
    try {
      this.logger.log(`Publishing TrainTrip to Cloud: ${trainTripId}: TODO`)
      // Talk to the Cloud Service to sync with Cloud
      //   await pipe(
      //     this.request(registerCloud, { trainTripId }),
      //     TE.mapLeft((err) => this.logger.error(err)),
      //   )()
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

export const env = {
  [TrainTripPublisherURI]: {
    register: (id: string) =>
      T.accessM((r: Context) => T.pure(r[contextEnv].ctx.register(id))),
    registerIfPending: (id: string) =>
      T.accessM((r: Context) => T.pure(r[contextEnv].ctx.registerIfPending(id))),
  },
}
export const provideTrainTripPublisher = F.implement(TrainTripPublisher)(env)
