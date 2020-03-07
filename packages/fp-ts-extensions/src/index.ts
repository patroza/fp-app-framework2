/* eslint-disable @typescript-eslint/no-explicit-any */

import { pipe } from "fp-ts/lib/pipeable"

import { AsyncResult } from "./TaskEither"
import { Result } from "./Either"

export * from "./general"

import * as TE from "./TaskEither"
import * as E from "./Either"
import * as RE from "./ReaderEither"
import * as T from "fp-ts/lib/Task"
import * as RTE from "./ReaderTaskEither"

import * as t from "./Io"

export { t, T, RE, RTE }

const toolDepsInstance = Object.freeze({
  E: Object.freeze({ liftErr: E.liftErr(), startWith: E.right }),
  TE: Object.freeze({ liftErr: TE.liftErr(), startWith: TE.right }),
  RE: Object.freeze({ liftErr: RE.liftErr() }),
  RTE: Object.freeze({ liftErr: RTE.liftErr() }),
})
export const toolDeps = <TErr>(): ToolDeps<TErr> => toolDepsInstance as ToolDeps<TErr>

export const trampoline = <TErr, TOut, TArgs extends readonly any[]>(
  func: (lifters: ToolDeps<TErr>) => (...args: TArgs) => TOut,
) => {
  const lifters = toolDepsInstance as ToolDeps<TErr>
  const withLifters = func(lifters)
  return withLifters
}

export const trampolineE = <TErr, TOut, TArgs extends readonly any[]>(
  func: (lifters: ToolDeps<TErr>) => (...args: TArgs) => E.Either<TErr, TOut>,
) => {
  const lifters = toolDeps<TErr>()
  const withLifters = func(lifters)
  return withLifters
}

export type ToolDeps<TE> = {
  E: {
    liftErr: <T, TE2 extends TE>(e: () => E.Either<TE2, T>) => () => E.Either<TE, T>
    startWith: <T>(i: T) => E.Either<TE, T>
  }
  RE: {
    liftErr: <T, TI, TE2 extends TE>(
      e: RE.ReaderEither<TI, TE2, T>,
    ) => RE.ReaderEither<TI, TE, T>
    //startWith: <T>(i: T) => RE.ReaderEither<TE, T>
  }
  TE: {
    liftErr: <T, TE2 extends TE>(
      e: () => TE.TaskEither<TE2, T>,
    ) => () => TE.TaskEither<TE, T>
    startWith: <T>(i: T) => TE.TaskEither<TE, T>
  }
  RTE: {
    liftErr: <T, TI, TE2 extends TE>(
      e: RTE.ReaderTaskEither<TI, TE2, T>,
    ) => RTE.ReaderTaskEither<TI, TE, T>
    //startWith: <T>(i: T) => RTE.ReaderTaskEither<TE, T>
  }
}

export { AsyncResult, Result }
export { TE, E }
export { pipe }
