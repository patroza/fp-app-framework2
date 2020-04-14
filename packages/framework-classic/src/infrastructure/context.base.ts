import { generateKey } from "./SimpleContainer"
import Event from "../event"
import { RecordContext, UnitOfWork } from "@fp-app/framework"

export interface RecordContextWithEvents<T> extends RecordContext<T> {
  // Workarounds for playing around with immutable Entities that have to be updated
  // after they're finished changing.
  processEvents: (record: T, events: Event[]) => void
}

export const UOWKey = generateKey<UnitOfWork>("unit-of-work")
