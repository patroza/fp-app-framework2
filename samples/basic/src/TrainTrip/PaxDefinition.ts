//import { summon } from "@morphic-ts/batteries/lib/summoner"

import { typedKeysOf, ValidationError } from "@fp-app/framework"
import { E, t, withBla, decodeErrors } from "@fp-app/fp-ts-extensions"
import { PositiveInt } from "@fp-app/fp-ts-extensions/src/Io"
import { flow } from "fp-ts/lib/function"

/* Pax: No domain validation, just primitives. **/
const Pax = t.type(
  {
    adults: t.Int,
    babies: t.Int,
    children: t.Int,
    infants: t.Int,
    teenagers: t.Int,
  },
  "Pax",
)

type PaxType = t.TypeOf<typeof Pax>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Pax extends PaxType {}
export { Pax }

export interface PaxNumberBrand {
  readonly PaxNumber: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

const PaxNumber = withBla(
  t.brand(
    PositiveInt, // a codec representing the type to be refined
    (n): n is t.Branded<PositiveInt, PaxNumberBrand> => n >= 0 && n <= 6, // a custom type guard using the build-in helper `Branded`
    "PaxNumber", // the name must match the readonly field in the brand
  ),
  value => {
    if (!PositiveInt.is(value)) {
      return "Invalid input"
    }
    return `requires between 0 and max 6, but ${value} was specified.`
  },
)

export type PaxNumber = t.TypeOf<typeof PaxNumber>

const PaxFields = t.type(
  {
    adults: PaxNumber,
    babies: PaxNumber,
    children: PaxNumber,
    infants: PaxNumber,
    teenagers: PaxNumber,
  },
  "PaxFields",
)

type PaxFieldsType = t.TypeOf<typeof PaxFields>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PaxFields extends PaxFieldsType {}

export interface PaxDefinitionBrand {
  readonly PaxDefinition: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

const _PaxDefinition = withBla(
  t.brand(
    PaxFields, // a codec representing the type to be refined
    (p): p is t.Branded<PaxFields, PaxDefinitionBrand> =>
      typedKeysOf(p).some(k => p[k] > 0) &&
      typedKeysOf(p).reduce((prev, cur) => (prev += p[cur]), 0) <= 6, // a custom type guard using the build-in helper `Branded`
    "PaxDefinition", // the name must match the readonly field in the brand
  ),
  value => {
    if (!PaxFields.is(value)) {
      return "Invalid input"
    }
    return `requires at least 1 and max 6 people, but ${typedKeysOf(value).reduce(
      (prev, cur) => (prev += value[cur]),
      0,
    )} were specified`
  },
)

const PaxDefinitionExtension = {
  create: flow(
    _PaxDefinition.decode,
    E.mapLeft(x => new ValidationError(decodeErrors(x))),
  ),
}

const PaxDefinition = {
  ..._PaxDefinition,
  ...PaxDefinitionExtension,
} as typeof _PaxDefinition & typeof PaxDefinitionExtension

type PaxDefinitionType = t.TypeOf<typeof PaxDefinition>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PaxDefinition extends PaxDefinitionType {}

export default PaxDefinition

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
