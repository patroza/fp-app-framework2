/* eslint-disable @typescript-eslint/no-explicit-any */
// export * from "@matechs/prelude/lib/either"

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
import { Do as DoOriginal } from "fp-ts-contrib/lib/Do"

export * from "fp-ts/lib/TaskEither"

export const Do = () => DoOriginal(TE.taskEither)
export type AsyncResult<TSuccess, TError> = TaskEither<TError, TSuccess>

export const chain: <E2, A, B>(
  f: (a: A) => TE.TaskEither<E2, B>,
) => <E1>(ma: TE.TaskEither<E1, A>) => TE.TaskEither<E1 | E2, B> = TE.chain as any

export const TFold = flow(E.fold, T.map)

const mapStatic = <TCurrent, TNew>(value: TNew) => map<TCurrent, TNew>(toValue(value))
export const toVoid = toValue<void>(void 0)
// export const endResult = mapStatic<void>(void 0)

/**
 * Execute promise, if success return right, if fail; won't catch thrown Exception.
 */
export const tryExecute = <T, TE>(func: T.Task<T>) => TE.rightTask<TE, T>(func)

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

export const liftLeft = <TE>() => <T, TE2 extends TE>(e: TaskEither<TE2, T>) =>
  e as TaskEither<TE, T>
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
