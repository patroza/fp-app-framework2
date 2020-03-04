/* eslint-disable @typescript-eslint/no-explicit-any */
// export * from "fp-ts/lib/Either"

import { Either } from "fp-ts/lib/Either"
import { map } from "fp-ts/lib/TaskEither"
import { pipe } from "fp-ts/lib/pipeable"

import * as E from "./Either"
import * as T from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"

import { TaskEither } from "fp-ts/lib/TaskEither"
import { flow } from "fp-ts/lib/function"
import { sequence, resultAll } from "./Either"

export * from "fp-ts/lib/TaskEither"

export type AsyncResult<TSuccess, TError> = TaskEither<TError, TSuccess>

export const TFold = flow(E.fold, T.map)

// useful tools for .compose( continuations
export const mapStatic = <TCurrent, TNew>(value: TNew) =>
  map<TCurrent, TNew>(toValue(value))
export const toValue = <TNew>(value: TNew) => () => value
export const toVoid = toValue<void>(void 0)
// export const endResult = mapStatic<void>(void 0)

export const mapStaticE = <TCurrent, TNew>(value: TNew) =>
  E.map<TCurrent, TNew>(toValue(value))

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

function chainTeeTask<T, TDontCare, E>(
  f: PipeFunction<T, TDontCare, E>,
): (inp: AsyncResult<T, E>) => AsyncResult<T, E>
function chainTeeTask(f: any) {
  return TE.chain((input: any) => pipe(f(input), mapStatic(input)))
}

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

// export function ifError<T, E, TNew>(defaultVal: (e: E) => Promise<TNew>): (result: Result<T, E>) => AsyncResult<TNew, E>;
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

// Unused
export const asyncValueOrUndefined = <TInput, TOutput, TErrorOutput>(
  input: TInput | undefined,
  resultCreator: PipeFunction<TInput, TOutput, TErrorOutput>,
): AsyncResult<TOutput | undefined, TErrorOutput> => async () => {
  if (input === undefined) {
    return E.right(undefined)
  }
  return await resultCreator(input)()
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
    return E.right(undefined)
  }
  return E.right(await resultCreator(input))
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

export const mapper = <T, TOut>(mapper: (i: T) => TOut) => <FOut>(
  f: (i: TOut) => FOut,
) => <T2 extends T>(i: T2) => f(mapper(i))

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

export function toMagicTup<T1, T2, T3>(
  input: readonly [[T1, T2], T3],
): readonly [T1, T2, T3]
export function toMagicTup([tup1, el]: any) {
  return tup1.concat([el])
}

export function apply<A, B>(a: A, f: (a: A) => B): B {
  return f(a)
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

function compose<TInput, TError, TOutput>(
  ab: (c: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
function compose<TInput, TError, B, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (c: TE.TaskEither<TError, B>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
function compose<TInput, TError, B, C, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (b: TE.TaskEither<TError, B>) => TE.TaskEither<TError, C>,
  cd: (c: TE.TaskEither<TError, C>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
function compose<TInput, TError, B, C, D, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (b: TE.TaskEither<TError, B>) => TE.TaskEither<TError, C>,
  cd: (c: TE.TaskEither<TError, C>) => TE.TaskEither<TError, D>,
  de: (d: TE.TaskEither<TError, D>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
function compose<TInput, TError, B, C, D, E, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (b: TE.TaskEither<TError, B>) => TE.TaskEither<TError, C>,
  cd: (c: TE.TaskEither<TError, C>) => TE.TaskEither<TError, D>,
  de: (d: TE.TaskEither<TError, D>) => TE.TaskEither<TError, E>,
  ef: (e: TE.TaskEither<TError, E>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
function compose<TInput, TError, B, C, D, E, F, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (b: TE.TaskEither<TError, B>) => TE.TaskEither<TError, C>,
  cd: (c: TE.TaskEither<TError, C>) => TE.TaskEither<TError, D>,
  de: (d: TE.TaskEither<TError, D>) => TE.TaskEither<TError, E>,
  ef: (e: TE.TaskEither<TError, E>) => TE.TaskEither<TError, F>,
  fg: (f: TE.TaskEither<TError, F>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
function compose<TInput, TError, B, C, D, E, F, G, TOutput>(
  ab: (a: TE.TaskEither<TError, TInput>) => TE.TaskEither<TError, B>,
  bc: (b: TE.TaskEither<TError, B>) => TE.TaskEither<TError, C>,
  cd: (c: TE.TaskEither<TError, C>) => TE.TaskEither<TError, D>,
  de: (d: TE.TaskEither<TError, D>) => TE.TaskEither<TError, E>,
  ef: (e: TE.TaskEither<TError, E>) => TE.TaskEither<TError, F>,
  fg: (f: TE.TaskEither<TError, F>) => TE.TaskEither<TError, G>,
  gh: (g: TE.TaskEither<TError, G>) => TE.TaskEither<TError, TOutput>,
): (input: TInput) => TE.TaskEither<TError, TOutput>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compose<TInput, TError, TOutput>(...a: any[]) {
  return (input: TInput) =>
    pipe<TE.TaskEither<TError, TInput>, TE.TaskEither<TError, TOutput>>(
      TE.right<TError, TInput>(input),
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      ...a,
    )
}

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

export type LeftArg<T> = E.LeftArg<ThenArg<T>>
export type RightArg<T> = E.RightArg<ThenArg<T>>

export type ThenArg<T> = T extends Promise<infer U>
  ? U
  : T extends (...args: any[]) => Promise<infer V>
  ? V
  : T

const ok = TE.right
const err = TE.left
const isOk = E.isRight
const isErr = E.isLeft

export {
  TEDo as do,
  liftTE as lift,
  chainTeeTask as chainTee,
  chainTupTask as chainTup,
  chainFlatTupTask as chainFlatTup,
  compose,
  ok,
  err,
  isOk,
  isErr,
}
