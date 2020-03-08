import * as t from "io-ts"
export * from "io-ts"
import { PathReporter } from "io-ts/lib/PathReporter"
import { withMessage } from "io-ts-types/lib/withMessage"
import { withValidate } from "io-ts-types/lib/withValidate"
import { either } from "./Either"
export { PathReporter, withMessage, withValidate }

export interface PositiveBrand {
  readonly Positive: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

export const date = new t.Type<Date, Date, unknown>(
  "Date",
  (input): input is Date => input instanceof Date,
  // `t.success` and `t.failure` are helpers used to build `Either` instances
  (u, c) => {
    if (u instanceof Date) {
      return t.success(u)
    } else {
      return t.failure(u, c)
    }
  },
  // `A` and `O` are the same, so `encode` is just the identity function
  t.identity,
)

const Positive = t.brand(
  t.number, // a codec representing the type to be refined
  (n): n is t.Branded<number, PositiveBrand> => n >= 0, // a custom type guard using the build-in helper `Branded`
  "Positive", // the name must match the readonly field in the brand
)

export type Positive = t.TypeOf<typeof Positive>
export const PositiveInt = t.intersection([t.Int, Positive])

export type PositiveInt = t.TypeOf<typeof PositiveInt>

export const DateFromString = new t.Type<Date, string, unknown>(
  "DateFromString",
  (u): u is Date => u instanceof Date,
  (u, c) =>
    either.chain(t.string.validate(u, c), s => {
      const d = new Date(s)
      return isNaN(d.getTime()) ? t.failure(u, c) : t.success(d)
    }),
  // ALT
  // pipe(
  //   t.string.validate(u, c),
  //   E.chain(s => {
  //     const d = new Date(s)
  //     return isNaN(d.getTime()) ? t.failure(u, c) : t.success(d)
  //   }),
  // ),
  a => a.toISOString(),
)

// Piping
export const NumberCodec = new t.Type<number, string, string>(
  "NumberCodec",
  t.number.is,
  (s, c) => {
    const n = parseFloat(s)
    return isNaN(n) ? t.failure(s, c) : t.success(n)
  },
  String,
)

export const merge = <T1, T2>(t1: T1, t2: T2) => ({
  ...t1,
  ...t2,
})

export const NumberFromString = t.string.pipe(NumberCodec, "NumberFromString")
