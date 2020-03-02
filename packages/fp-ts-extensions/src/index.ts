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
import { Task } from "fp-ts/lib/Task"
import { flow } from "fp-ts/lib/function"

export { T }

export const result = TE.taskEither
export type AsyncResult<TSuccess, TError> = TaskEither<TError, TSuccess>
export type Result<TSuccess, TError> = Either<TError, TSuccess>
export const err = <TSuccess = never, TError = never>(
  e: TError,
): Result<TSuccess, TError> => left<TError, TSuccess>(e)
export const ok = <TSuccess = never, TError = never>(
  a: TSuccess,
): Result<TSuccess, TError> => right<TError, TSuccess>(a)
export type Ok<TSuccess> = Task<Right<TSuccess>>
export type Err<TErr> = Task<Left<TErr>>

export const okTask = <TSuccess = never, TError = never>(a: TSuccess) =>
  TE.fromEither(ok<TSuccess, TError>(a))
export const errTask = <TSuccess = never, TError = never>(e: TError) =>
  TE.fromEither(err<TSuccess, TError>(e))

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

export { map, pipe }

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

export function chainTeeTask<T, TDontCare, E>(
  f: PipeFunction<T, TDontCare, E>,
): (inp: AsyncResult<T, E>) => AsyncResult<T, E>
export function chainTeeTask(f: any) {
  return TE.chain((input: any) => pipe(f(input), mapStatic(input)))
}

const EDo = <T>(func: (input: T) => void) => E.map(tee(func))
const TEDo = <T>(func: (input: T) => void) => TE.map(tee(func))

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

// Easily pass input -> (input -> output) -> [output, input]
function chainTupTask<TInput, T, E>(f: (x: TInput) => TaskEither<E, T>) {
  return TE.chain((input: TInput) =>
    pipe(
      f(input),
      TE.map(x => [x, input] as const),
    ),
  )
}

function chainTup<TInput, T, E>(
  f: (x: TInput) => Result<T, E>,
): (inp: Result<TInput, E>) => Result<readonly [T, TInput], E>
function chainTup(f: any) {
  return E.chain((input: any) =>
    pipe(
      f(input),
      E.map(x => [x, input] as const),
    ),
  )
}

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

  const mapHasChanged = map(a => (a ? (hasChanged = true) : null)) as any
  const items = mappers.map(() => mapHasChanged)
  const execution = flatten(zip(mappers, items))

  const an = ok<boolean, TErr>(false) as any
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  return pipe(
    an,
    ...execution,
    map(() => hasChanged),
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
) => (i: T) => f(mapper(i))

// We create tuples in reverse, under the assumption that the further away we are
// from previous statements, the less important their output becomes..
// Alternatively we can always create two variations :)
function chainFlatTupTask<TInput, TInputB, T, E>(
  f: (x: readonly [TInput, TInputB]) => AsyncResult<T, E>,
): (
  input: AsyncResult<readonly [TInput, TInputB], E>,
) => AsyncResult<readonly [T, TInput, TInputB], E>
function chainFlatTupTask(f: any) {
  return TE.chain((input: any) =>
    pipe(
      f(input),
      TE.map(x => [x, ...input] as const),
    ),
  )
}

function chainFlatTup<
  TInput,
  TInputB,
  TInput2 extends readonly [TInput, TInputB],
  T,
  E
>(
  f: (x: TInput2) => Result<T, E>,
): (
  input: Result<readonly [TInput, TInputB], E>,
) => Result<readonly [T, TInput, TInputB], E>
function chainFlatTup(f: any) {
  return E.chain((input: any) =>
    pipe(
      f(input),
      E.map(x => [x, ...input] as const),
    ),
  )
}

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

export const success = <TErr>() => ok<void, TErr>(void 0)

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

export function compose<TInput, TError, TOutput>(
  ab: (c: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
export function compose<TInput, TError, B, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (c: TE.TaskEither<TError, B>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
export function compose<TInput, TError, B, C, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (b: TE.TaskEither<TError, B>) => TE.TaskEither<TError, C>,
  cd: (c: TE.TaskEither<TError, C>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
export function compose<TInput, TError, B, C, D, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (b: TE.TaskEither<TError, B>) => TE.TaskEither<TError, C>,
  cd: (c: TE.TaskEither<TError, C>) => TE.TaskEither<TError, D>,
  de: (d: TE.TaskEither<TError, D>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
export function compose<TInput, TError, B, C, D, E, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (b: TE.TaskEither<TError, B>) => TE.TaskEither<TError, C>,
  cd: (c: TE.TaskEither<TError, C>) => TE.TaskEither<TError, D>,
  de: (d: TE.TaskEither<TError, D>) => TE.TaskEither<TError, E>,
  ef: (e: TE.TaskEither<TError, E>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
export function compose<TInput, TError, B, C, D, E, F, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (b: TE.TaskEither<TError, B>) => TE.TaskEither<TError, C>,
  cd: (c: TE.TaskEither<TError, C>) => TE.TaskEither<TError, D>,
  de: (d: TE.TaskEither<TError, D>) => TE.TaskEither<TError, E>,
  ef: (e: TE.TaskEither<TError, E>) => TE.TaskEither<TError, F>,
  fg: (f: TE.TaskEither<TError, F>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
export function compose<TInput, TError, B, C, D, E, F, G, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (b: TE.TaskEither<TError, B>) => TE.TaskEither<TError, C>,
  cd: (c: TE.TaskEither<TError, C>) => TE.TaskEither<TError, D>,
  de: (d: TE.TaskEither<TError, D>) => TE.TaskEither<TError, E>,
  ef: (e: TE.TaskEither<TError, E>) => TE.TaskEither<TError, F>,
  fg: (f: TE.TaskEither<TError, F>) => TE.TaskEither<TError, G>,
  gh: (g: TE.TaskEither<TError, G>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compose<TInput, TError, TOutput>(...a: any[]) {
  return (input: TInput) =>
    pipe<TE.TaskEither<TError, TInput>, TE.TaskEither<TError, TOutput>>(
      TE.right<TError, TInput>(input),
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      ...a,
    )
}

export const toTE = <T, T2, TE>(func: (i: T) => Either<TE, T2>) => <TI extends T>(
  i: TI,
) => TE.fromEither(func(i))

export function composeE<TInput, TError, TOutput>(
  ab: (c: E.Either<TError, TInput>) => E.Either<TError, TOutput>,
): (input: TInput) => E.Either<TError, TOutput>
export function composeE<TInput, TError, B, TOutput>(
  ab: (a: E.Either<TError, TInput>) => E.Either<TError, B>,
  bc: (c: E.Either<TError, B>) => E.Either<TError, TOutput>,
): (input: TInput) => E.Either<TError, TOutput>
// TODO: Copy BError/CError etc behavior
export function composeE<TInput, TError, B, BError, C, CError, TErr, TOutput>(
  ab: (a: E.Either<TError, TInput>) => E.Either<BError, B>,
  bc: (b: E.Either<BError, B>) => E.Either<CError, C>,
  cd: (c: E.Either<CError, C>) => E.Either<TErr, TOutput>,
): (input: TInput) => E.Either<TErr, TOutput>
export function composeE<TInput, TError, B, C, D, TOutput>(
  ab: (a: E.Either<TError, TInput>) => E.Either<TError, B>,
  bc: (b: E.Either<TError, B>) => E.Either<TError, C>,
  cd: (b: E.Either<TError, C>) => E.Either<TError, D>,
  de: (c: E.Either<TError, D>) => E.Either<TError, TOutput>,
): (input: TInput) => E.Either<TError, TOutput>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function composeE<TInput, TError, TOutput>(...a: any[]) {
  return (input: TInput) =>
    pipe<E.Either<TError, TInput>, E.Either<TError, TOutput>>(
      E.right<TError, TInput>(input),
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      ...a,
    )
}

const EnhancedTE = {
  ...TE,
  do: TEDo,
  lift: liftTE,
  chainTup: chainTupTask,
  chainFlatTup: chainFlatTupTask,
}

const EnhancedE = {
  ...E,
  do: EDo,
  lift: liftE,
  chainTup,
  chainFlatTup,
}

export { EnhancedTE as TE, EnhancedE as E }
