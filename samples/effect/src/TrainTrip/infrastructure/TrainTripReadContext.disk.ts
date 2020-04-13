import { ReadContext as RC } from "@fp-app/io.diskdb"
import { TrainTripView } from "../usecases/GetTrainTrip"
import { T, F, O } from "@/meffect"

export default class TrainTripReadContext extends RC<TrainTripView> {
  constructor() {
    super("trainTrip")
  }
}

const ReadContextURI = "@fp-app/effect/traintrip-read-context"
const ReadContext_ = F.define({
  [ReadContextURI]: {
    read: F.fn<(id: string) => T.UIO<O.Option<TrainTripView>>>(),
  },
})
export interface ReadContext extends F.TypeOf<typeof ReadContext_> {}

export const ReadContext = F.opaque<ReadContext>()(ReadContext_)

export const { read } = F.access(ReadContext)[ReadContextURI]

export const contextEnv = "@fp-app/effect/traintrip-read-context/ctx"

export interface Context {
  [contextEnv]: {
    ctx: TrainTripReadContext
  }
}

export const env = {
  [ReadContextURI]: {
    read: (id: string) =>
      T.accessM((r: Context) => T.encaseTask(r[contextEnv].ctx.read(id))),
  },
}

export const provideReadContext = F.implement(ReadContext)(env)
