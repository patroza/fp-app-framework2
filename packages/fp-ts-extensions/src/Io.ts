import * as t from "io-ts"
export * from "io-ts"
import { PathReporter } from "io-ts/lib/PathReporter"

export { PathReporter }

export interface PositiveBrand {
  readonly Positive: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

const Positive = t.brand(
  t.number, // a codec representing the type to be refined
  (n): n is t.Branded<number, PositiveBrand> => n >= 0, // a custom type guard using the build-in helper `Branded`
  "Positive", // the name must match the readonly field in the brand
)

export type Positive = t.TypeOf<typeof Positive>
export const PositiveInt = t.intersection([t.Int, Positive])

export type PositiveInt = t.TypeOf<typeof PositiveInt>
