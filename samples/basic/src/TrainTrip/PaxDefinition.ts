//import { summon } from "@morphic-ts/batteries/lib/summoner"

import { createValidator, Joi, predicate, typedKeysOf, Value } from "@fp-app/framework"
import { pipe, E, t } from "@fp-app/fp-ts-extensions"

export default class PaxDefinition extends Value {
  static create = (pax: Pax) =>
    pipe(
      validate(pax),
      E.chain(
        predicate(
          p => typedKeysOf(p).some(k => p[k] > 0),
          "pax requires at least 1 person",
        ),
      ),
      E.chain(
        predicate(
          p => typedKeysOf(p).reduce((prev, cur) => (prev += p[cur]), 0) <= 6,
          "pax must be 6 or less people",
        ),
      ),
      E.map(validatedPax => new PaxDefinition(validatedPax)),
    )

  private constructor(readonly value: Pax) {
    super()
  }
}

const Pax = t.type(
  {
    // adults: t.Int,
    adults: t.number,
    babies: t.number,
    children: t.number,
    infants: t.number,
    teenagers: t.number,
  },
  "Pax",
)

interface PositiveBrand {
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

// COmpiler gives some errors about PURI and unique symbol etc..
// const Pax = summon(F =>
//   F.interface(
//     {
//       adults: F.number(),
//       babies: F.number(),
//       children: F.number(),
//       infants: F.number(),
//       teenagers: F.number(),
//     },
//     "Person",
//   ),
// )
// export type Pax = t.TypeOf<typeof Pax.type>

export type Pax = t.TypeOf<typeof Pax>

const paxEntrySchema = Joi.number()
  .integer()
  .min(0)
  .max(6)
  .required()
export const paxSchema = Joi.object({
  adults: paxEntrySchema,
  babies: paxEntrySchema,
  children: paxEntrySchema,
  infants: paxEntrySchema,
  teenagers: paxEntrySchema,
}).required()
const validate = createValidator<Pax>(paxSchema)
