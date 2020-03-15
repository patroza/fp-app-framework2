/* eslint-disable @typescript-eslint/no-explicit-any */

import { pipe } from "fp-ts/lib/pipeable"

import { ReadonlyNonEmptyArray } from "fp-ts/lib/ReadonlyNonEmptyArray"
import { AsyncResult } from "./TaskEither"
import { Result } from "./Either"

export * from "./general"

import * as TE from "./TaskEither"
import * as E from "./Either"
import * as O from "fp-ts/lib/Option"
import * as RE from "./ReaderEither"
import * as T from "fp-ts/lib/Task"
import * as TO from "./TaskOption"
import * as NA from "fp-ts/lib/NonEmptyArray"
import * as RA from "fp-ts/lib/ReadonlyArray"
import * as RANE from "fp-ts/lib/ReadonlyNonEmptyArray"
import * as RT from "fp-ts/lib/ReaderTask"
import * as RTE from "./ReaderTaskEither"

import * as t from "./Io"

export { O, NA, t, T, RA, RANE, RE, RT, RTE, ReadonlyNonEmptyArray, TO }

const toolDepsInstance = Object.freeze({
  E: Object.freeze({ liftErr: E.liftErr(), startWith: E.right }),
  TE: Object.freeze({ liftErr: TE.liftErr(), startWith: TE.right }),
  RE: Object.freeze({ liftErr: RE.liftErr() }),
  RTE: Object.freeze({ liftErr: RTE.liftErr() }),
})
export const toolDeps = <TErr>(): ToolDeps<TErr> => toolDepsInstance as ToolDeps<TErr>

export const trampoline = <TErr, TOut, TArgs extends readonly any[]>(
  func: (lifters: ToolDeps<TErr>) => (...args: TArgs) => TOut,
) => {
  const lifters = toolDepsInstance as ToolDeps<TErr>
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
  E: {
    liftErr: <T, TE2 extends TE>(e: () => E.Either<TE2, T>) => () => E.Either<TE, T>
    startWith: <T>(i: T) => E.Either<TE, T>
  }
  RE: {
    liftErr: <T, TI, TE2 extends TE>(
      e: RE.ReaderEither<TI, TE2, T>,
    ) => RE.ReaderEither<TI, TE, T>
    //startWith: <T>(i: T) => RE.ReaderEither<TE, T>
  }
  TE: {
    liftErr: <T, TE2 extends TE>(
      e: () => TE.TaskEither<TE2, T>,
    ) => () => TE.TaskEither<TE, T>
    startWith: <T>(i: T) => TE.TaskEither<TE, T>
  }
  RTE: {
    liftErr: <T, TI, TE2 extends TE>(
      e: RTE.ReaderTaskEither<TI, TE2, T>,
    ) => RTE.ReaderTaskEither<TI, TE, T>
    //startWith: <T>(i: T) => RTE.ReaderTaskEither<TE, T>
  }
}

export { AsyncResult, Result }
export { TE, E }
export { pipe }

export function withBla<T, TI>(
  codec: T & { validate: any },
  message: (i: TI) => string,
) {
  return t.withValidate(codec as any, function(i: any, c: any) {
    return E.mapLeft(function(errors: any[]) {
      // When children have errors, report them
      // otherwise if parent has errors, report that
      if (c.length === 1 && errors[0].value != i) {
        return errors
      }
      return [
        {
          value: i,
          context: c,
          message: message(i),
          actual: i,
        },
      ]
    })(codec.validate(i, c))
  }) as T
}

export const unsafeUnwrapDecode = <A, E extends t.Errors>(e: Result<A, E>) => {
  if (E.isErr(e)) {
    throw new Error(decodeErrors(e.left))
  }
  return e.right
}

export function decodeErrors(x: t.Errors) {
  return x
    .map(({ message, context: [root, ...rest], value }) => {
      const processCtx = (current: t.ContextEntry, path?: string) =>
        `${path ? `[${path}]: ` : ""}${current.type.name}: ${
          message ? message : getErrorMessage(current, value)
        }`
      return rest.length
        ? processCtx(rest[rest.length - 1], rest.map(x => x.key).join("."))
        : processCtx(root)
    })
    .join("\n")
}

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getErrorMessage = (current: t.ContextEntry, value: any) => {
  switch (current.type.name) {
    case "NonEmptyString":
      return "Must not be empty"
  }
  if (current.type.name.startsWith("NonEmptyArray<")) {
    return "Must not be empty"
  }
  // switch (type) {
  //   case "PaxNumber":
  //     return `requires between 0 and max 6, but ${value} was specified.`
  //   case "PaxDefinition":
  //     return `requires at least 1 and max 6 people, but ${Object.keys(value).reduce(
  //       (prev, cur) => (prev += value[cur]),
  //       0,
  //     )} were specified`
  // }
  return "unknown error"
}
