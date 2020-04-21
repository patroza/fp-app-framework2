/* eslint-disable @typescript-eslint/no-explicit-any */

import { pipe } from "@matechs/prelude"

import { ReadonlyNonEmptyArray } from "fp-ts/lib/ReadonlyNonEmptyArray"
import { AsyncResult } from "./TaskEither"
import { Result } from "./Either"

export * from "./general"

import * as TE from "./TaskEither"
import * as E from "./Either"
import * as O from "./Option"
import * as RE from "./ReaderEither"
import * as Task from "fp-ts/lib/Task"
import * as TO from "./TaskOption"
import * as NA from "fp-ts/lib/NonEmptyArray"
import * as RA from "fp-ts/lib/ReadonlyArray"
import * as RANE from "fp-ts/lib/ReadonlyNonEmptyArray"
import * as RT from "fp-ts/lib/ReaderTask"
import * as RTE from "./ReaderTaskEither"

import * as t from "./Io"

export * from "@matechs/prelude"
export { O, NA, t, RA, RANE, RE, RT, RTE, Task, ReadonlyNonEmptyArray, TO }

export { AsyncResult, Result }
export { TE, E }
export { pipe }

export function withBla<T, TI>(
  codec: T & { validate: any },
  message: (i: TI) => string,
) {
  return t.withValidate(codec as any, function (i: any, c: any) {
    return E.mapLeft(function (errors: any[]) {
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
        ? processCtx(rest[rest.length - 1], rest.map((x) => x.key).join("."))
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
