import { I } from "@matechs/aio"
export * from "@matechs/aio/lib/types"
export { readonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export interface PositiveBrand {
  readonly Positive: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

const Positive = I.brand(
  I.number, // a codec representing the type to be refined
  (n): n is I.Branded<number, PositiveBrand> => n >= 0, // a custom type guard using the build-in helper `Branded`
  "Positive", // the name must match the readonly field in the brand
)

export type Positive = I.TypeOf<typeof Positive>
export const PositiveInt = I.intersection([I.Int, Positive])

export type PositiveInt = I.TypeOf<typeof PositiveInt>
