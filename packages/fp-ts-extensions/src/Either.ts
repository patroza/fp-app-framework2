/* eslint-disable @typescript-eslint/no-explicit-any */
// export * from "fp-ts/lib/Either"

import { Either, Right } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"

import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"

import { flatten, zip } from "lodash"
import { toValue, tee, liftType, flattenErrors } from "./general"

export * from "fp-ts/lib/Either"

export type Result<TSuccess, TError> = Either<TError, TSuccess>
const err = E.left
const ok = E.right

export const fromBool = <T>(
  value: T,
  predicate: (value: T) => boolean,
): E.Either<T, T> => {
  if (!predicate(value)) {
    return err(value)
  }
  return ok(value)
}

export const fromBool2 = <T>(predicate: (value: T) => boolean) => (
  value: T,
): E.Either<T, T> => {
  if (!predicate(value)) {
    return err(value)
  }
  return ok(value)
}

export const fromErrorish = <T, TE extends Error>(
  errorish: T & {
    error?: TE
  },
): E.Either<TE, T> => {
  if (errorish.error) {
    return err(errorish.error)
  }
  return ok(errorish)
}

export const mapStatic = <TCurrent, TNew>(value: TNew) =>
  E.map<TCurrent, TNew>(toValue(value))

export function chainTee<T, TDontCare, E>(
  f: PipeFunction2<T, TDontCare, E>,
): (inp: Result<T, E>) => Result<T, E>
export function chainTee(f: any) {
  return E.chain((input: any) => pipe(f(input), mapStatic(input)))
}

const _do = <T>(func: (input: T) => void) => E.map(tee(func))

function chainTup<TInput, T, E>(f: (x: TInput) => Either<E, T>) {
  return E.chain((input: TInput) =>
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

export const sequence = <T, E>(results: Result<T, E>[]): Result<T[], E> =>
  pipe(resultAll(results), E.mapLeft(flattenErrors))

export const resultAll = <T, E>(results: Result<T, E>[]): Result<T[], E[]> => {
  const errors = results.filter(isErr).map(x => x.left)
  if (errors.length) {
    return err(errors)
  }
  const successes = results.filter(isOk).map(x => x.right)
  return ok(successes)
}

export const valueOrUndefined = <TInput, TOutput, TErrorOutput>(
  input: TInput | undefined,
  resultCreator: (input: TInput) => Result<TOutput, TErrorOutput>,
): Result<TOutput | undefined, TErrorOutput> => {
  if (input === undefined) {
    return ok(undefined)
  }
  return resultCreator(input)
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

export const conditional = <TInput, TOutput, TErrorOutput>(
  input: TInput | undefined,
  resultCreator: PipeFunction2<TInput, TOutput, TErrorOutput>,
): Result<TOutput | undefined, TErrorOutput> => {
  if (input === undefined) {
    return ok(undefined)
  }
  return resultCreator(input)
}

export const lift = <TE>() => <T, TI, TE2 extends TE>(e: (i: TI) => Either<TE2, T>) => (
  i: TI,
) => pipe(e(i), E.mapLeft(liftType<TE>()))

// Experiment

// Very nasty, need to find a cleaner approach
// TODO: This actually breaks error type enforcement
export const anyTrue = <TErr = any>(...mappers: any[]): Result<boolean, TErr> => {
  let hasChanged = false

  const mapHasChanged = E.map(a => (a ? (hasChanged = true) : null)) as any
  const items = mappers.map(() => mapHasChanged)
  const execution = flatten(zip(mappers, items))

  const an = ok<TErr, boolean>(false) as any
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  return pipe(
    an,
    ...execution,
    E.map(() => hasChanged),
  )
}

export type PipeFunction2<TInput, TOutput, TErr> = (
  input: TInput,
) => Result<TOutput, TErr>
export type PipeFunction2N<TOutput, TErr> = () => Result<TOutput, TErr>

export function chainFlatTup<
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
export function chainFlatTup(f: any) {
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

const success = <TErr>() => ok<TErr, void>(void 0)

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

export const toTaskEither = <T, T2, TE>(func: (i: T) => Either<TE, T2>) => <
  TI extends T
>(
  i: TI,
) => TE.fromEither(func(i))

export function compose<TInput, TError, TOutput>(
  ab: (c: E.Either<TError, TInput>) => E.Either<TError, TOutput>,
): (input: TInput) => E.Either<TError, TOutput>
export function compose<TInput, TError, B, TOutput>(
  ab: (a: E.Either<TError, TInput>) => E.Either<TError, B>,
  bc: (c: E.Either<TError, B>) => E.Either<TError, TOutput>,
): (input: TInput) => E.Either<TError, TOutput>
// TODO: Copy BError/CError etc behavior
export function compose<TInput, TError, B, BError, C, CError, TErr, TOutput>(
  ab: (a: E.Either<TError, TInput>) => E.Either<BError, B>,
  bc: (b: E.Either<BError, B>) => E.Either<CError, C>,
  cd: (c: E.Either<CError, C>) => E.Either<TErr, TOutput>,
): (input: TInput) => E.Either<TErr, TOutput>
export function compose<TInput, TError, B, C, D, TOutput>(
  ab: (a: E.Either<TError, TInput>) => E.Either<TError, B>,
  bc: (b: E.Either<TError, B>) => E.Either<TError, C>,
  cd: (b: E.Either<TError, C>) => E.Either<TError, D>,
  de: (c: E.Either<TError, D>) => E.Either<TError, TOutput>,
): (input: TInput) => E.Either<TError, TOutput>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compose<TInput, TError, TOutput>(...a: any[]) {
  return (input: TInput) =>
    pipe<E.Either<TError, TInput>, E.Either<TError, TOutput>>(
      E.right<TError, TInput>(input),
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      ...a,
    )
}

export type LeftArg<T> = T extends E.Left<infer U> ? U : never
export type RightArg<T> = T extends E.Right<infer U> ? U : never
const isOk = E.isRight
const isErr = E.isLeft

export { _do as do, chainTup, ok, err, isOk, isErr, success }
