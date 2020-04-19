import TrainTrip, { Events } from "../TrainTrip"
import { T } from "@e/meffect"
import * as PostCommit from "../eventhandlers/postCommit"
import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"
import { tupled } from "fp-ts/lib/function"

export const save = <TEvents extends readonly Events[]>(
  tt: TrainTrip,
  events: TEvents,
  method: "change" | "delete" | "add" = "change",
) =>
  T.Do()
    .do(
      method === "delete"
        ? TC.remove(tt)
        : method === "add"
        ? TC.add(tt)
        : TC.registerChanged(tt),
    )
    .do(TC.save())
    .do(handlePostCommitEvents(events))
    .bind("updatedTrainTrip", method === "delete" ? T.pure(tt) : TC.loadE(tt.id))
    .return((r) => r.updatedTrainTrip)

export default save

export const saveT = tupled(save)

const handlePostCommitEvents = <TEvents extends readonly Events[]>(events: TEvents) =>
  events.length
    ? T.sequenceT(
        PostCommit.handlers(events[0]),
        ...events.slice(1).map((x) => PostCommit.handlers(x)),
      )
    : T.unit
