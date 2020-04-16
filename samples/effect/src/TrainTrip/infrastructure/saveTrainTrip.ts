import TrainTrip, { Events } from "../TrainTrip"
import { Do } from "fp-ts-contrib/lib/Do"
import { T } from "@e/meffect"
import * as PreCommit from "../eventhandlers/preCommit"
import * as PostCommit from "../eventhandlers/postCommit"
import { sequenceT } from "fp-ts/lib/Apply"
import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"
import { tupled } from "fp-ts/lib/function"

export const save = <TEvents extends readonly Events[]>(
  tt: TrainTrip,
  events: TEvents,
  method: "change" | "delete" | "add" = "change",
) =>
  Do(T.effect)
    .do(
      method === "delete"
        ? TC.remove(tt)
        : method === "add"
        ? TC.add(tt)
        : TC.registerChanged(tt),
    )
    // eventHandlers should update records accordingly
    .do(handleEvents(events))
    .do(TC.save())
    .do(handlePostCommitEvents(events))
    .bind("updatedTrainTrip", method === "delete" ? T.pure(tt) : TC.loadE(tt.id))
    .return((r) => r.updatedTrainTrip)

export default save

export const saveT = tupled(save)

const handleEvents = <TEvents extends readonly Events[]>(events: TEvents) =>
  events.length
    ? sequenceT(T.effect)(
        PreCommit.handlers(events[0]),
        ...events.slice(1).map((x) => PreCommit.handlers(x)),
      )
    : T.unit

const handlePostCommitEvents = <TEvents extends readonly Events[]>(events: TEvents) =>
  events.length
    ? sequenceT(T.effect)(
        PostCommit.handlers(events[0]),
        ...events.slice(1).map((x) => PostCommit.handlers(x)),
      )
    : T.unit
