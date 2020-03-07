import { TE, AsyncResult, RTE } from "@fp-app/fp-ts-extensions"
import Event from "../event"
import { Disposable } from "../utils"
import DomainEventHandler from "./domainEventHandler"
import { DbError } from "./errors"
import { autoinject } from "./SimpleContainer"

// tslint:disable-next-line:max-classes-per-file
@autoinject
export default abstract class ContextBase implements Disposable {
  private disposed = false

  constructor(private readonly eventHandler: DomainEventHandler) {}

  readonly save = (): AsyncResult<void, DbError | Error> => {
    if (this.disposed) {
      throw new Error("The context is already disposed")
    }
    return this.eventHandler.commitAndPostEvents(
      () => this.getAndClearEvents(),
      () => this.saveImpl(),
    )
  }

  dispose() {
    this.disposed = true
  }

  protected abstract getAndClearEvents(): Event[]

  protected abstract saveImpl(): AsyncResult<void, DbError>
}

export interface UnitOfWork extends Disposable {
  // TODO: Why Error?
  save: () => TE.TaskEither<DbError | Error, void>
}

export interface RecordContext<T> {
  add: (record: T) => void
  remove: (record: T) => void
  load: RTE.ReaderTaskEither<string, DbError, T>
}
