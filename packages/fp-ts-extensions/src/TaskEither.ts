/* eslint-disable @typescript-eslint/no-explicit-any */
// export * from "fp-ts/lib/Either"

import { map } from "fp-ts/lib/TaskEither"
import { pipe } from "fp-ts/lib/pipeable"
import { array } from "fp-ts/lib/Array"

import * as E from "./Either"
import * as T from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"
import * as RTE from "fp-ts/lib/ReaderTaskEither"

import { TaskEither } from "fp-ts/lib/TaskEither"
import { flow, tuple } from "fp-ts/lib/function"
import { toValue, tee, ThenArg } from "./general"
import { pipe as _pipe } from "lodash/fp"

export * from "fp-ts/lib/TaskEither"

export type AsyncResult<TSuccess, TError> = TaskEither<TError, TSuccess>

export const TFold = flow(E.fold, T.map)

// useful tools for .compose( continuations
export const mapStatic = <TCurrent, TNew>(value: TNew) =>
  map<TCurrent, TNew>(toValue(value))
export const toVoid = toValue<void>(void 0)
// export const endResult = mapStatic<void>(void 0)

/**
 * Execute promise, if success return right, if fail; won't catch thrown Exception.
 */
export const tryExecute = <T, TE>(func: T.Task<T>) => TE.rightTask<TE, T>(func)

/**
 * Execute promise, if success return right, if fail; won't catch thrown Exception.
 */
export const tryExecuteFW = <T, TI, TE>(func: (input: TI) => Promise<T>) => <
  TI2 extends TI
>(
  i: TI2,
): TE.TaskEither<TE, T> => TE.rightTask<TE, T>(() => func(i))

export function chainTee<T, TDontCare, E>(
  f: RTE.ReaderTaskEither<T, E, TDontCare>,
): (inp: AsyncResult<T, E>) => AsyncResult<T, E>
export function chainTee(f: any) {
  return TE.chain((input: any) => pipe(f(input), mapStatic(input)))
}

const _do = <T>(func: (input: T) => void) => TE.map(tee(func))

// Easily pass input -> (input -> output) -> [output, input]
export function chainTup<TInput, T, E>(f: (x: TInput) => TaskEither<E, T>) {
  return TE.chain((input: TInput) =>
    pipe(
      f(input),
      TE.map((x) => tuple(x, input)),
    ),
  )
}

export const traverse = <T, E>(results: AsyncResult<T, E>[]): AsyncResult<T[], E> => {
  const traverseM = array.traverse(TE.taskEither)
  return traverseM(results, (x) => x)
}

export const liftLeft = <TE>() => <T, TE2 extends TE>(e: () => TaskEither<TE2, T>) =>
  e as () => TaskEither<TE, T>
// flow(e, TE.mapLeft(liftType<TE>()))

export const liftErr = liftLeft

// We create tuples in reverse, under the assumption that the further away we are
// from previous statements, the less important their output becomes..
// Alternatively we can always create two variations :)
export function chainFlatTup<TInput, TInputB, T, E>(
  f: (x: readonly [TInput, TInputB]) => AsyncResult<T, E>,
): (
  input: AsyncResult<readonly [TInput, TInputB], E>,
) => AsyncResult<[T, TInput, TInputB], E>
export function chainFlatTup(f: any) {
  return TE.chain((input: any) =>
    pipe(
      f(input),
      TE.map((x) => tuple(x, ...input)),
    ),
  )
}

// compose = flow(TE.right, ...rest)
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
export function compose(...a: any[]) {
  const anyFlow: any = flow
  return anyFlow(TE.right, ...a)
}

export const asyncCreateResult = <TErrorOutput = string, TInput = any, TOutput = any>(
  input: TInput | undefined,
  resultCreator: (input: TInput) => Promise<TOutput>,
): AsyncResult<TOutput | undefined, TErrorOutput> => {
  if (input === undefined) {
    return ok(undefined)
  }
  return TE.rightTask(() => resultCreator(input))
}

export function chainTasks<TErr, T = void>(
  tasks: TE.TaskEither<TErr, T>[],
): TE.TaskEither<TErr, T> {
  const exec = _pipe(...tasks.map((t) => TE.chain(() => t)))
  return exec(ok(void 0))
}

export type LeftArg<T> = E.LeftArg<ThenArg<T>>
export type RightArg<T> = E.RightArg<ThenArg<T>>

export const ok = TE.right
export const err = TE.left
export const isOk = E.isRight
export const isErr = E.isLeft

export { _do as do, _do as exec }
