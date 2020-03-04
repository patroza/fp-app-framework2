/* eslint-disable @typescript-eslint/no-explicit-any */
// export * from "fp-ts/lib/Either"

import { Right, Left } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"

import * as E from "fp-ts/lib/Either"
import * as T from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"

import { AsyncResult } from "./TaskEither"
import { Result } from "./Either"

export * from "./general"

export const isErr = <T, TErr>(x: Result<T, TErr>): x is Left<TErr> => x._tag === "Left"
export const isOk = <T, TErr>(x: Result<T, TErr>): x is Right<T> => x._tag === "Right"

import * as EnhancedTE from "./TaskEither"
import * as EnhancedE from "./Either"

export const createLifters = <T>() => ({
  E: EnhancedE.lift<T>(),
  TE: EnhancedTE.lift<T>(),
})

export const toolDeps = <TErr>(): ToolDeps<TErr> => ({
  liftE: EnhancedE.lift<TErr>(),
  liftTE: EnhancedTE.lift<TErr>(),
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

export { AsyncResult, Result, T }
export { EnhancedTE as TE, EnhancedE as E }
export { pipe }
