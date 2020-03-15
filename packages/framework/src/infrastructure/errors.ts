// tslint:disable:max-classes-per-file

import { ErrorBase } from "../errors"

export type DbError = RecordNotFound
export type ApiError = RecordNotFound

// TODO: we can model this as Some instead
export class RecordNotFound extends ErrorBase {
  readonly name = "RecordNotFound"
  constructor(readonly type: string, readonly id: string) {
    super(`The ${type} with ${id} was not found`)
  }
}

// EXCEPTIONS

export class ConnectionException extends Error {
  constructor(readonly error: Error) {
    super("A connection error ocurred")
  }
}

export class CouldNotAquireDbLockException extends Error {
  constructor(readonly type: string, readonly id: string, readonly error: Error) {
    super(`Couldn't lock db record ${type}: ${id}`)
  }
}

export class OptimisticLockException extends Error {
  constructor(readonly type: string, readonly id: string) {
    super(`Existing ${type} ${id} record changed`)
  }
}
