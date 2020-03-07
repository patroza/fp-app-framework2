/* eslint-disable @typescript-eslint/no-explicit-any */
// export * from "fp-ts/lib/Either"

import { Either, Right } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"

import * as E from "fp-ts/lib/Either"
import * as RE from "fp-ts/lib/ReaderEither"
import * as TE from "fp-ts/lib/TaskEither"

import { flatten, zip } from "lodash"
import { toValue, tee, liftType, flattenErrors } from "./general"
import { tuple, flow } from "fp-ts/lib/function"

export * from "fp-ts/lib/Either"

import { pipe as _pipe } from "lodash/fp"

export type Result<TSuccess, TError> = Either<TError, TSuccess>
const err = E.left
const ok = E.right

export const exec = <TErr = any>(func: () => void) => {
  func()
  return success<TErr>()
}

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
      E.map(x => tuple(x, input)),
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
  resultCreator: RE.ReaderEither<TInput, TErrorOutput, TOutput>,
): Result<TOutput | undefined, TErrorOutput> => {
  if (input === undefined) {
    return ok(undefined)
  }
  return resultCreator(input)
}

export const liftLeft = <TE>() => <T, TI, TE2 extends TE>(
  e: (i: TI) => Either<TE2, T>,
) => (i: TI) => pipe(e(i), E.mapLeft(liftType<TE>()))

export const liftErr = liftLeft

// Experiment

// Very nasty, need to find a cleaner approach
// TODO: This actually breaks error type enforcement
export const anyTrue = <TErr = any>(...mappers: any[]): Result<boolean, TErr> => {
  let hasChanged = false

  const mapHasChanged = E.map(a => (a ? (hasChanged = true) : null)) as any
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

export const toTaskEither = <T, T2, TE>(func: (i: T) => Either<TE, T2>) => <
  TI extends T
>(
  i: TI,
) => TE.fromEither(func(i))

// compose = flow(E.right, ...rest)
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
export function compose(...a: any[]) {
  const anyFlow: any = flow
  return anyFlow(E.right, ...a)
}

export function chainTasks<TErr, T = void>(
  tasks: (() => Either<TErr, T>)[],
): Either<TErr, T> {
  const exec = _pipe(...tasks.map(t => E.chain(t)))
  return exec(ok(void 0))
}

export type LeftArg<T> = T extends E.Left<infer U> ? U : never
export type RightArg<T> = T extends E.Right<infer U> ? U : never
const isOk = E.isRight
const isErr = E.isLeft

export { _do as do, chainTup, ok, err, isOk, isErr, success }
