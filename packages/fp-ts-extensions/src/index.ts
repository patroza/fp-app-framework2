/* eslint-disable @typescript-eslint/no-explicit-any */

import { pipe } from "fp-ts/lib/pipeable"

import { AsyncResult } from "./TaskEither"
import { Result } from "./Either"

export * from "./general"

import * as TE from "./TaskEither"
import * as E from "./Either"
import * as RE from "fp-ts/lib/ReaderEither"
import * as T from "fp-ts/lib/Task"
import * as RTE from "fp-ts/lib/ReaderTaskEither"

export { T, RE, RTE }

export const toolDeps = <TErr>(): ToolDeps<TErr> => ({
  E: { liftErr: E.liftErr<TErr>(), startWith: i => E.right(i) },
  TE: { liftErr: TE.liftErr<TErr>(), startWith: i => TE.right(i) },
})

export const trampoline = <TErr, TOut, TArgs extends readonly any[]>(
  func: (lifters: ToolDeps<TErr>) => (...args: TArgs) => TOut,
) => {
  const lifters = toolDeps<TErr>()
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
    liftErr: <T, TI, TE2 extends TE>(
      e: (i: TI) => E.Either<TE2, T>,
    ) => (i: TI) => E.Either<TE, T>
    startWith: <T>(i: T) => E.Either<TE, T>
  }
  TE: {
    liftErr: <T, TI, TE2 extends TE>(
      e: (i: TI) => TE.TaskEither<TE2, T>,
    ) => (i: TI) => TE.TaskEither<TE, T>
    startWith: <T>(i: T) => TE.TaskEither<TE, T>
  }
}

export type Tramp<TInput, TOutput, TErr> = (input: TInput) => E.Either<TErr, TOutput>

export { AsyncResult, Result }
export { TE, E }
export { pipe }
