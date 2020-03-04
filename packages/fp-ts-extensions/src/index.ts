/* eslint-disable @typescript-eslint/no-explicit-any */

import { pipe } from "fp-ts/lib/pipeable"

import { AsyncResult } from "./TaskEither"
import { Result } from "./Either"

export * from "./general"

import * as TE from "./TaskEither"
import * as E from "./Either"

export const createLifters = <T>() => ({
  E: E.lift<T>(),
  TE: TE.lift<T>(),
})

export const toolDeps = <TErr>(): ToolDeps<TErr> => ({
  liftE: E.lift<TErr>(),
  liftTE: TE.lift<TErr>(),
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
  liftE: <T, TI, TE2 extends TE>(
    e: (i: TI) => E.Either<TE2, T>,
  ) => (i: TI) => E.Either<TE, T>
  liftTE: <T, TI, TE2 extends TE>(
    e: (i: TI) => TE.TaskEither<TE2, T>,
  ) => (i: TI) => TE.TaskEither<TE, T>
}

export type Tramp<TInput, TOutput, TErr> = (input: TInput) => E.Either<TErr, TOutput>

export { AsyncResult, Result }
export { TE, E }
export { pipe }
