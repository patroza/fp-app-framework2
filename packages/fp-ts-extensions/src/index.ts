/* eslint-disable @typescript-eslint/no-explicit-any */
// export * from "fp-ts/lib/Either"

import { Either, Right, Left, left, right } from "fp-ts/lib/Either"
import { map } from "fp-ts/lib/TaskEither"
import { pipe } from "fp-ts/lib/pipeable"

import * as E from "fp-ts/lib/Either"
import * as T from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"

import { flatten, zip } from "lodash"
import { TaskEither } from "fp-ts/lib/TaskEither"
import { flow } from "fp-ts/lib/function"

import { AsyncResult } from "./TaskEither"
import { Result } from "./Either"

const err = <TSuccess = never, TError = never>(e: TError): Result<TSuccess, TError> =>
  left<TError, TSuccess>(e)
const ok = <TSuccess = never, TError = never>(
  a: TSuccess,
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
) => (right<TError, TSuccess>(a) as any) as Result<TSuccess, TError>

export const TFold = flow(E.fold, T.map)
export const boolToEither = <T>(
  value: T,
  predicate: (value: T) => boolean,
): E.Either<T, T> => {
  if (!predicate(value)) {
    return err(value)
  }
  return ok(value)
}

export const boolToEither2 = <T>(predicate: (value: T) => boolean) => (
  value: T,
): E.Either<T, T> => {
  if (!predicate(value)) {
    return err(value)
  }
  return ok(value)
}

export const errorishToEither = <T, TE extends Error>(
  errorish: T & {
    error?: TE
  },
): E.Either<TE, T> => {
  if (errorish.error) {
    return err(errorish.error)
  }
  return ok(errorish)
}

// useful tools for .compose( continuations
export const mapStatic = <TCurrent, TNew>(value: TNew) =>
  map<TCurrent, TNew>(toValue(value))
export const toValue = <TNew>(value: TNew) => () => value
export const toVoid = toValue<void>(void 0)
// export const endResult = mapStatic<void>(void 0)

export const mapStaticE = <TCurrent, TNew>(value: TNew) =>
  E.map<TCurrent, TNew>(toValue(value))

export function chainTee<T, TDontCare, E>(
  f: PipeFunction2<T, TDontCare, E>,
): (inp: Result<T, E>) => Result<T, E>
export function chainTee(f: any) {
  return E.chain((input: any) => pipe(f(input), mapStaticE(input)))
}

/**
 * Execute promise, if success return right, if fail; Cause exception.
 */
export const tryExecute = <T>(func: () => Promise<T>) => async () =>
  E.right(await func())

export const tryExecuteFW = <T, TI>(func: (input: TI) => Promise<T>) => <
  TI2 extends TI
>(
  i: TI2,
): TE.TaskEither<never, T> => async () => E.right(await func(i))

// TODO: Should come with map already wrapped aroun it
export function tee<T, TDontCare>(
  f: (x: T) => Promise<TDontCare>,
): (input: T) => Promise<T>
export function tee<T, TDontCare>(f: (x: T) => TDontCare): (input: T) => T
export function tee(f: any) {
  return (input: any) => {
    const r = f(input)
    if (Promise.resolve(r) === r) {
      return r.then(() => input)
    } else {
      return input
    }
  }
}

export const regainType = <T, TOut>(f: (i: T) => TOut) => <T2 extends T>(i: T2) => f(i)

// export function ifErrorflatMap<T, TNew, E>(defaultVal: (e: E) => AsyncResult<TNew, E>): (result: Result<T, E>) => AsyncResult<TNew, E>;
export function ifErrorflatMap<T, TNew, E>(
  defaultVal: (e: E) => Result<TNew, E>,
): (result: Result<T, E>) => Result<TNew, E>
export function ifErrorflatMap(defaultVal: any) {
  return (result: Result<any, any>) => {
    if (isOk(result)) {
      return result
    } else {
      return defaultVal(result.left)
    }
  }
}

// export function ifError<T, E, TNew>(defaultVal: (e: E) => Promise<TNew>): (result: Result<T, E>) => AsyncResult<TNew, E>;
export function ifError<T, E, TNew>(
  defaultVal: (e: E) => TNew,
): (result: Result<T, E>) => Result<TNew, E>
export function ifError(defaultVal: any) {
  return (result: any) => {
    if (isOk(result)) {
      return result
    }
    return ok(defaultVal(result.left))
  }
}

export const joinError = <T>(result: Result<T, string[]>) =>
  pipe(
    result,
    E.mapLeft(x => x.join("\n")),
  )

export function resultTuple<T, T2, E>(
  r1: Result<T, E>,
  r2: Result<T2, E>,
): Result<readonly [T, T2], E[]>
export function resultTuple<T, T2, T3, E>(
  r1: Result<T, E>,
  r2: Result<T2, E>,
  r3: Result<T3, E>,
): Result<readonly [T, T2, T3], E[]>
export function resultTuple<T, T2, T3, T4, E>(
  r1: Result<T, E>,
  r2: Result<T2, E>,
  r3: Result<T3, E>,
  r4: Result<T4, E>,
): Result<readonly [T, T2, T3, T4], E[]>
export function resultTuple<T, T2, T3, T4, T5, E>(
  r1: Result<T, E>,
  r2: Result<T2, E>,
  r3: Result<T3, E>,
  r4: Result<T4, E>,
  r5: Result<T5, E>,
): Result<readonly [T, T2, T3, T4, T5], E[]>
export function resultTuple(...results: Result<any, any>[]) {
  const errors = results.filter(isErr).map(x => x.left)
  if (errors.length) {
    return err(errors)
  }
  const successes = (results as Right<any>[]).map(x => x.right) as readonly any[]
  return ok(successes)
}

export const sequence = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  return pipe(resultAll(results), E.mapLeft(flattenErrors))
}

export const resultAll = <T, E>(results: Result<T, E>[]): Result<T[], E[]> => {
  const errors = results.filter(isErr).map(x => x.left)
  if (errors.length) {
    return err(errors)
  }
  const successes = results.filter(isOk).map(x => x.right)
  return ok(successes)
}

export const isErr = <T, TErr>(x: Result<T, TErr>): x is Left<TErr> => x._tag === "Left"
export const isOk = <T, TErr>(x: Result<T, TErr>): x is Right<T> => x._tag === "Right"

export const sequenceAsync = <T, E>(
  results: AsyncResult<T, E>[],
): AsyncResult<T[], E> => {
  return async () => sequence(await Promise.all(results.map(x => x())))
}

export const resultAllAsync = <T, E>(
  results: AsyncResult<T, E>[],
): AsyncResult<T[], E[]> => {
  return async () => resultAll(await Promise.all(results.map(x => x())))
}

export const flattenErrors = <E>(errors: E[]) => errors[0]

export const valueOrUndefined = <TInput, TOutput, TErrorOutput>(
  input: TInput | undefined,
  resultCreator: (input: TInput) => Result<TOutput, TErrorOutput>,
): Result<TOutput | undefined, TErrorOutput> => {
  if (input === undefined) {
    return ok(undefined)
  }
  return resultCreator(input)
}

// Unused
export const asyncValueOrUndefined = <TInput, TOutput, TErrorOutput>(
  input: TInput | undefined,
  resultCreator: PipeFunction<TInput, TOutput, TErrorOutput>,
): AsyncResult<TOutput | undefined, TErrorOutput> => async () => {
  if (input === undefined) {
    return ok(undefined)
  }
  return await resultCreator(input)()
}

export const createResult = <TErrorOutput = string, TInput = any, TOutput = any>(
  input: TInput | undefined,
  resultCreator: (input: TInput) => TOutput,
): Result<TOutput | undefined, TErrorOutput> => {
  if (input === undefined) {
    return ok(undefined)
  }
  return ok(resultCreator(input))
}

export const applyIfNotUndefined = <T, TOutput>(
  input: T | undefined,
  f: (input: T) => TOutput,
): TOutput | undefined => {
  if (input === undefined) {
    return undefined
  }
  return f(input)
}

export const asyncCreateResult = <TErrorOutput = string, TInput = any, TOutput = any>(
  input: TInput | undefined,
  resultCreator: (input: TInput) => Promise<TOutput>,
): AsyncResult<TOutput | undefined, TErrorOutput> => async () => {
  if (input === undefined) {
    return ok(undefined)
  }
  return ok(await resultCreator(input))
}

export const conditional = <TInput, TOutput, TErrorOutput>(
  input: TInput | undefined,
  resultCreator: PipeFunction2<TInput, TOutput, TErrorOutput>,
): Result<TOutput | undefined, TErrorOutput> => {
  if (input === undefined) {
    return ok(undefined)
  }
  return resultCreator(input)
}

export const liftType = <T>() => <TInput extends T>(e: TInput) => e as T

export const createLifters = <T>() => ({
  E: liftE<T>(),
  TE: liftTE<T>(),
})

const liftE = <TE>() => <T, TI, TE2 extends TE>(e: (i: TI) => Either<TE2, T>) => (
  i: TI,
) => pipe(e(i), E.mapLeft(liftType<TE>()))

const liftTE = <TE>() => <T, TI, TE2 extends TE>(e: (i: TI) => TaskEither<TE2, T>) => (
  i: TI,
) => pipe(e(i), TE.mapLeft(liftType<TE>()))

// Experiment

// Very nasty, need to find a cleaner approach
// TODO: This actually breaks error type enforcement
export const anyTrue = <TErr = any>(...mappers: any[]): Result<boolean, TErr> => {
  let hasChanged = false

  const mapHasChanged = E.map(a => (a ? (hasChanged = true) : null)) as any
  const items = mappers.map(() => mapHasChanged)
  const execution = flatten(zip(mappers, items))

  const an = ok<boolean, TErr>(false) as any
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  return pipe(
    an,
    ...execution,
    E.map(() => hasChanged),
  )
}

// TODO: what if you could replace
// (event) => kickAsync(event).compose(
// with:
// compose(

// it would have to generate (event) => kickAsync(event).compose(
// but also it would mean to add: map(event => event.id) to get just the id.
// const startWithValInt = <TErr>() => <T>(value: T) => ok<T, TErr>(value) as Result<T, TErr>

// export const startWithVal = <TErr>() => <T>(value: T) => Promise.resolve(startWithValInt<TErr>()(value))
// reversed curry:
export const startWithVal = <T>(value: T) => <TErr>() => TE.right<TErr, T>(value)
// export const startWithVal2 = startWithVal()
export const startWithVal2 = <T>(value: T) => startWithVal(value)()

export type PipeFunction<TInput, TOutput, TErr> = (
  input: TInput,
) => AsyncResult<TOutput, TErr>
export type PipeFunctionN<TOutput, TErr> = () => AsyncResult<TOutput, TErr>
export type PipeFunction2<TInput, TOutput, TErr> = (
  input: TInput,
) => Result<TOutput, TErr>
export type PipeFunction2N<TOutput, TErr> = () => Result<TOutput, TErr>

// helper for addressing some issues with syntax highlighting in editor when using multiple generics
export type AnyResult<T = any, TErr = any> = Result<T, TErr>

export const mapper = <T, TOut>(mapper: (i: T) => TOut) => <FOut>(
  f: (i: TOut) => FOut,
) => <T2 extends T>(i: T2) => f(mapper(i))

export function toMagicTup<T1, T2, T3>(
  input: readonly [[T1, T2], T3],
): readonly [T1, T2, T3]
export function toMagicTup([tup1, el]: any) {
  return tup1.concat([el])
}

export function apply<A, B>(a: A, f: (a: A) => B): B {
  return f(a)
}

//////
// Stabl at simplify working with resultTuple
// tslint:disable:max-line-length
// Doesn't work
export function resultTuple2<TInput, T, T2, E>(
  r1: (input: TInput) => Result<T, E>,
  r2: (input: TInput) => Result<T2, E>,
): (input: TInput) => Result<readonly [T, T2], E[]>
export function resultTuple2<TInput, T, T2, T3, E>(
  r1: (input: TInput) => Result<T, E>,
  r2: (input: TInput) => Result<T2, E>,
  r3: (input: TInput) => Result<T3, E>,
): (input: TInput) => Result<readonly [T, T2, T3], E[]>
export function resultTuple2<TInput, T, T2, T3, T4, E>(
  r1: (input: TInput) => Result<T, E>,
  r2: (input: TInput) => Result<T2, E>,
  r3: (input: TInput) => Result<T3, E>,
  r4: (input: TInput) => Result<T4, E>,
): (input: TInput) => Result<readonly [T, T2, T3, T4], E[]>
export function resultTuple2<TInput, T, T2, T3, T4, T5, E>(
  r1: (input: TInput) => Result<T, E>,
  r2: (input: TInput) => Result<T2, E>,
  r3: (input: TInput) => Result<T3, E>,
  r4: (input: TInput) => Result<T4, E>,
  r5: (input: TInput) => Result<T5, E>,
): (input: TInput) => Result<readonly [T, T2, T3, T4, T5], E[]>
export function resultTuple2(...resultFNs: ((input: any) => Result<any, any>)[]) {
  return (input: any) => {
    const results = resultFNs.map(x => x(input))
    const errors = results.filter(isErr).map(x => x.left)
    if (errors.length) {
      return err(errors)
    }
    const successes = (results as Right<any>[]).map(x => x.right) as readonly any[]
    return ok(successes)
  }
}

// not so cool?
export function resultTuple3<TInput, T, T2, E>(
  input: TInput,
  r1: (input: TInput) => Result<T, E>,
  r2: (input: TInput) => Result<T2, E>,
): Result<readonly [T, T2], E[]>
export function resultTuple3<TInput, T, T2, T3, E>(
  input: TInput,
  r1: (input: TInput) => Result<T, E>,
  r2: (input: TInput) => Result<T2, E>,
  r3: (input: TInput) => Result<T3, E>,
): Result<readonly [T, T2, T3], E[]>
export function resultTuple3<TInput, T, T2, T3, T4, E>(
  input: TInput,
  r1: (input: TInput) => Result<T, E>,
  r2: (input: TInput) => Result<T2, E>,
  r3: (input: TInput) => Result<T3, E>,
  r4: (input: TInput) => Result<T4, E>,
): Result<readonly [T, T2, T3, T4], E[]>
export function resultTuple3<TInput, T, T2, T3, T4, T5, E>(
  input: TInput,
  r1: (input: TInput) => Result<T, E>,
  r2: (input: TInput) => Result<T2, E>,
  r3: (input: TInput) => Result<T3, E>,
  r4: (input: TInput) => Result<T4, E>,
  r5: (input: TInput) => Result<T5, E>,
): Result<readonly [T, T2, T3, T4, T5], E[]>
export function resultTuple3(
  input: any,
  ...resultFNs: ((input: any) => Result<any, any>)[]
) {
  const results = resultFNs.map(x => x(input))
  const errors = results.filter(isErr).map(x => x.left)
  if (errors.length) {
    return err(errors)
  }
  const successes = (results as Right<any>[]).map(x => x.right) as readonly any[]
  return ok(successes)
}

export function apply2<T1, T2, TOut>(
  func: (...args: readonly [T1, T2]) => TOut,
): (args: readonly [T1, T2]) => TOut
export function apply2<T1, T2, T3, TOut>(
  func: (...args: readonly [T1, T2, T3]) => TOut,
): (args: readonly [T1, T2, T3]) => TOut
export function apply2(func: any) {
  return (args: any) => func(...args)
}

export function reverseApply<T1, T2, TOut>(
  func: (...args: readonly [T2, T1]) => TOut,
): (args: readonly [T1, T2]) => TOut
export function reverseApply<T1, T2, T3, TOut>(
  func: (...args: readonly [T3, T2, T1]) => TOut,
): (args: readonly [T1, T2, T3]) => TOut
export function reverseApply(func: any) {
  return (args: any) => func(...args.reverse())
}

// TODO: unbound - although who needs more than 3 anyway.
/*
export const apply2 = <T1, T2, TOut>(func: (t1: T1, t2: T2) => TOut) => (
  ...args: readonly [T1, T2]
) => func(...args)
export const reverseApply = <T1, T2, TOut>(func: (t2: T2, t1: T1) => TOut) => (
  ...args: readonly [T1, T2]
) =>
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  func(...(args.reverse() as any))

const reverse = <A extends Array<any>>(a: A): List.Reverse<A> =>
  (a.reverse() as unknown) as List.Reverse<A>

type Flip = <A extends Array<any>, R>(f: (...a: A) => R) => (...a: List.Reverse<A>) => R
const flip: Flip = fn => (...args) => fn(...(reverse(args) as any))
*/

// const compose = (...args) => <T>(input: T) =>
//   pipe(
//     TE.right(input),
//     ...args,
//   )

// export const pipeE = (...args) => <T>(input: T) =>
//   pipe(
//     E.right(input),
//     ...args,
//   )

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
    e: (i: TI) => Either<TE2, T>,
  ) => (i: TI) => Either<TE, T>
  liftTE: <T, TI, TE2 extends TE>(
    e: (i: TI) => TaskEither<TE2, T>,
  ) => (i: TI) => TaskEither<TE, T>
}

export const toolDeps = <TErr>(): ToolDeps<TErr> => ({
  liftE: liftE<TErr>(),
  liftTE: liftTE<TErr>(),
})

export type Tramp<TInput, TOutput, TErr> = (input: TInput) => E.Either<TErr, TOutput>

export type ThenArg<T> = T extends Promise<infer U>
  ? U
  : T extends (...args: any[]) => Promise<infer V>
  ? V
  : T

import * as EnhancedTE from "./TaskEither"
import * as EnhancedE from "./Either"

export { AsyncResult, Result, T }
export { EnhancedTE as TE, EnhancedE as E }
export { pipe }
