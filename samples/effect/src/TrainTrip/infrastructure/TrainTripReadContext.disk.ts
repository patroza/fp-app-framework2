import { ReadContext as RC } from "@fp-app/io.diskdb"
import { TrainTripView } from "../usecases/GetTrainTrip"
import { T, Free, O } from "@e/meffect"

export default class TrainTripReadContext extends RC<TrainTripView> {
  constructor() {
    super("trainTrip")
  }
}

const ReadContextURI = "@fp-app/effect/traintrip-read-context"
const ReadContext_ = Free.define({
  [ReadContextURI]: {
    read: Free.fn<(id: string) => T.Async<O.Option<TrainTripView>>>(),
  },
})
export interface ReadContext extends Free.TypeOf<typeof ReadContext_> {}

export const ReadContext = Free.opaque<ReadContext>()(ReadContext_)

export const { read } = Free.access(ReadContext)[ReadContextURI]

export const contextEnv = "@fp-app/effect/traintrip-read-context/ctx"

export interface RCContext {
  [contextEnv]: {
    ctx: TrainTripReadContext
  }
}

// TODO: move back into Free.implement
export const env = {
  [ReadContextURI]: {
    read: (id: string) =>
      T.accessM((r: RCContext) => T.encaseTask(r[contextEnv].ctx.read(id))),
  },
}

export const provideReadContext = Free.implement(ReadContext)(env)
