import { ReadContext as RC } from "@fp-app/io.diskdb"
import { TrainTripView } from "../usecases/GetTrainTrip"
import { effect as T, freeEnv as F } from "@matechs/effect"
import * as O from "fp-ts/lib/Option"

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
export type ReadContext = F.TypeOf<typeof ReadContext_>

export const ReadContext = F.opaque<ReadContext>()(ReadContext_)
export type HasReadContext = {
  [ReadContextURI]: {
    read: (id: string) => T.UIO<O.Option<TrainTripView>>
  }
}
export const { read } = F.access(ReadContext)[ReadContextURI]

export const provideReadContext = F.implement(ReadContext)({
  [ReadContextURI]: {
    read: (id: string) => {
      // TODO: make this a request-scoped instance
      // so the provide should then happen on the Request Level...
      const ctx = new TrainTripReadContext()
      return T.encaseTask(ctx.read(id))
    },
  },
})
