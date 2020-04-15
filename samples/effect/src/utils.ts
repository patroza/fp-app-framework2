import { TypeC } from "io-ts"
import { pipe } from "fp-ts/lib/pipeable"
import { E } from "./meffect"
import { ValidationError } from "@fp-app/framework"
import { decodeErrors } from "@fp-app/fp-ts-extensions"

export const createPrimitiveValidator = <T, A extends TypeC<any>>(t: A) => (
  input: unknown,
) =>
  pipe(
    t.decode(input),
    E.map((x) => x as T),
    E.mapLeft((x) => new ValidationError(decodeErrors(x))),
  )
