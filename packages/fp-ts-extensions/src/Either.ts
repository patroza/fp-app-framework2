/* eslint-disable @typescript-eslint/no-explicit-any */
// export * from "@matechs/prelude/lib/either"

import { Either } from "@matechs/prelude/lib/either"
import { pipe } from "fp-ts/lib/pipeable"

import * as A from "fp-ts/lib/Array"
import * as E from "@matechs/prelude/lib/either"
import * as RE from "fp-ts/lib/ReaderEither"
import * as TE from "fp-ts/lib/TaskEither"

import { flatten, zip } from "lodash"
import { toValue, tee } from "./general"
import { tuple } from "fp-ts/lib/function"

export * from "@matechs/prelude/lib/either"

import { pipe as _pipe } from "lodash/fp"

export type Result<TSuccess, TError> = Either<TError, TSuccess>
const err = E.left
const ok = E.right

export const chain: <E2, A, B>(
  f: (a: A) => E.Either<E2, B>,
) => <E1>(ma: E.Either<E1, A>) => E.Either<E1 | E2, B> = E.chain as any

export const fromBool = <T, TInput extends T = T>(
  value: TInput,
  predicate: (value: T) => boolean,
): E.Either<TInput, TInput> => {
  if (!predicate(value)) {
    return err(value)
  }
  return ok(value)
}

export const bimapFromBool = <T, TNew, ENew>(
  value: T,
  predicate: (value: T) => boolean,
  onLeft: (value: T) => ENew,
  onRight: (value: T) => TNew,
) => pipe(fromBool(value, predicate), E.bimap(onLeft, onRight))

export const bimapFromBool2 = <TNew, ENew>(
  bool: boolean,
  onLeft: () => ENew,
  onRight: () => TNew,
) => (bool ? E.right(onRight()) : E.left(onLeft()))

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
  f: RE.ReaderEither<T, E, TDontCare>,
): (inp: Result<T, E>) => Result<T, E>
export function chainTee(f: any) {
  return E.chain((input: any) => pipe(f(input), mapStatic(input)))
}

const _do = <T>(func: (input: T) => void) => E.map(tee(func))

function chainTup<TInput, T, E>(f: (x: TInput) => Either<E, T>) {
  return E.chain((input: TInput) =>
    pipe(
      f(input),
      E.map((x) => tuple(x, input)),
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

export const sequenceArray = A.array.sequence(E.either)

// keeps all errors
export const resultAll = <T, E>(results: Result<T, E>[]): Result<T[], E[]> => {
  const errors = results.filter(isErr).map((x) => x.left)
  if (errors.length) {
    return err(errors)
  }
  const successes = results.filter(isOk).map((x) => x.right)
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
  resultCreator: RE.ReaderEither<TInput, TErrorOutput, TOutput>,
): Result<TOutput | undefined, TErrorOutput> => {
  if (input === undefined) {
    return ok(undefined)
  }
  return resultCreator(input)
}

export const liftLeft = <TE>() => <T, TE2 extends TE>(e: Either<TE2, T>) =>
  e as Either<TE, T>

export const liftRight = <T>() => <T2 extends T, TE>(e: Either<TE, T2>) =>
  e as Either<TE, T>

export const liftErr = liftLeft

// Experiment

// Very nasty, need to find a cleaner approach
// TODO: This actually breaks error type enforcement
export const anyTrue = <TErr = any>(...mappers: any[]): Result<boolean, TErr> => {
  let hasChanged = false

  const mapHasChanged = E.map((a) => (a ? (hasChanged = true) : null)) as any
  const items = mappers.map(() => mapHasChanged)
  const execution = flatten(zip(mappers, items))

  return _pipe(
    ...execution,
    E.map(() => hasChanged),
  )(ok(false))
}

export function chainFlatTup<
  TInput,
  TInputB,
  TInput2 extends readonly [TInput, TInputB],
  T,
  E
>(
  f: (x: TInput2) => Result<T, E>,
): (input: Result<readonly [TInput, TInputB], E>) => Result<[T, TInput, TInputB], E>
export function chainFlatTup(f: any) {
  return E.chain((input: any) =>
    pipe(
      f(input),
      E.map((x) => tuple(x, ...input)),
    ),
  )
}

const success = <TErr>() => ok<TErr, void>(void 0)

export const liftToTaskEither = <T, T2, TE>(func: (i: T) => Either<TE, T2>) => <
  TI extends T
>(
  i: TI,
) => TE.fromEither(func(i))

export function chainTasks<TErr, T = void>(
  tasks: (() => Either<TErr, T>)[],
): Either<TErr, T> {
  const exec = _pipe(...tasks.map((t) => E.chain(t)))
  return exec(ok(void 0))
}

export type LeftArg<T> = T extends E.Left<infer U> ? U : never
export type RightArg<T> = T extends E.Right<infer U> ? U : never
const isOk = E.isRight
const isErr = E.isLeft

export { _do as do, _do as exec, chainTup, ok, err, isOk, isErr, success }

export const unsafeUnwrap = <A, E>(e: Result<A, E>) => {
  if (isErr(e)) {
    throw new Error(JSON.stringify(e))
  }
  return e.right
}

export const unsafeUnwrapErr = <A, E>(e: Result<A, E>) => {
  if (isOk(e)) {
    throw new Error(JSON.stringify(e))
  }
  return e.left
}
