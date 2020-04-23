import { ReadContext as RC } from "@fp-app/io.diskdb"
import { TrainTripView } from "../usecases/GetTrainTrip"
import { T, Service, O } from "@e/framework"

export default class TrainTripReadContext extends RC<TrainTripView> {
  constructor() {
    super("trainTrip")
  }
}

const ReadContextURI = "@fp-app/effect/traintrip-read-context"
const ReadContext_ = Service.define({
  [ReadContextURI]: {
    read: Service.fn<(id: string) => T.Async<O.Option<TrainTripView>>>(),
  },
})
export interface ReadContext extends Service.TypeOf<typeof ReadContext_> {}

export const ReadContext = Service.opaque<ReadContext>()(ReadContext_)

export const { read } = Service.access(ReadContext)[ReadContextURI]

export const contextEnv = "@fp-app/effect/traintrip-read-context/ctx"

export interface RCContext {
  [contextEnv]: {
    ctx: TrainTripReadContext
  }
}

// TODO: move back into Service.implement
export const env = {
  [ReadContextURI]: {
    read: (id: string) =>
      T.accessM((r: RCContext) => T.encaseTask(r[contextEnv].ctx.read(id))),
  },
}

export const provideReadContext = Service.implement(ReadContext)(env)
