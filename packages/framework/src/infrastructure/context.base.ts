import { O, RT, Task } from "@fp-app/fp-ts-extensions"
import { Disposable } from "../types"

// // tslint:disable-next-line:max-classes-per-file
// export default abstract class ContextBase implements Disposable {
//   private disposed = false

//   constructor(private readonly eventHandler: DomainEventHandler) {}

//   readonly save = () => {
//     if (this.disposed) {
//       throw new Error("The context is already disposed")
//     }
//     return this.eventHandler.commitAndPostEvents(
//       () => this.getAndClearEvents(),
//       () => this.saveImpl(),
//     )
//   }

//   dispose() {
//     this.disposed = true
//   }

//   protected abstract getAndClearEvents(): Event[]

//   protected abstract saveImpl(): Promise<void>
// }

export interface UnitOfWork extends Disposable {
  save: Task.Task<void>
}

export interface RecordContext<T> {
  add: (record: T) => void
  remove: (record: T) => void
  load: RT.ReaderTask<string, O.Option<T>>

  // Workarounds for playing around with immutable Entities that have to be updated
  // after they're finished changing.
  registerChanged: (record: T) => void
}
