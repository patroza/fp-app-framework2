import { TypeC } from "io-ts"
import { pipe } from "fp-ts/lib/pipeable"
import { ValidationError } from "@fp-app/framework"
import { decodeErrors, E } from "@fp-app/fp-ts-extensions"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createPrimitiveValidator = <T, A extends TypeC<any>>(t: A) => (
  input: unknown,
) =>
  pipe(
    t.decode(input),
    E.map((x) => x as T),
    E.mapLeft((x) => new ValidationError(decodeErrors(x))),
  )
