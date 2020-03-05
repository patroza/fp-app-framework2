import { createValidator, Joi, predicate, typedKeysOf, Value } from "@fp-app/framework"
import { pipe, E } from "@fp-app/fp-ts-extensions"

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

export interface Pax {
  adults: number
  babies: number
  children: number
  infants: number
  teenagers: number
}
