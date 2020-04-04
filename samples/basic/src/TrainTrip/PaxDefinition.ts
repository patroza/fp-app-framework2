import { summon } from "@morphic-ts/batteries/lib/summoner-ESBASTJ"
import { iotsConfig } from "@morphic-ts/io-ts-interpreters/lib"
import { Newtype, iso } from "newtype-ts"

import { typedKeysOf, ValidationError } from "@fp-app/framework"
import { t, withBla, decodeErrors } from "@fp-app/fp-ts-extensions"
import { PositiveInt, merge } from "@fp-app/fp-ts-extensions/src/Io"
import { flow } from "fp-ts/lib/function"
import { map, mapLeft, either } from "@fp-app/fp-ts-extensions/src/Either"

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

type PaxNumberISO = Newtype<{ readonly PaxNumber: unique symbol }, number>

const PaxNumberIso = iso<PaxNumberISO>()

const _PaxDefinition = summon((F) => {
  // TODO: I dont want a new type, I just want a refined, with ioTsConfig adjustment :/
  const PaxNumber = F.newtype<PaxNumberISO>("PaxNumber")(
    F.refined(
      F.number(),
      (n): n is t.Branded<PositiveInt, PaxNumberBrand> => n >= 0 && n <= 6,
      "PaxNumber",
    ),
    iotsConfig((x) =>
      withBla(x, (value) => {
        return `requires a number between 0 and max 6, but ${value} was specified.`
      }),
    ),
  )

  // yea.. no..
  type T = {
    adults: PaxNumberISO
    babies: PaxNumberISO
    children: PaxNumberISO
    infants: PaxNumberISO
    teenagers: PaxNumberISO
  }

  const validatePax = (p: T) =>
    typedKeysOf(p).some((k) => PaxNumberIso.unwrap(p[k]) > 0) &&
    typedKeysOf(p).reduce((prev, cur) => (prev += PaxNumberIso.unwrap(p[cur])), 0) <= 6

  return F.interface(
    {
      adults: PaxNumber,
      babies: PaxNumber,
      children: PaxNumber,
      infants: PaxNumber,
      teenagers: PaxNumber,
    },
    "Pax",
    iotsConfig((x) =>
      withBla(
        new t.Type(
          "PaxDefinition",
          (p2): p2 is T => {
            const p = p2 as T
            return validatePax(p)
          },
          (u, c) =>
            either.chain(x.validate(u, c), (v) =>
              validatePax(v) ? t.success(v) : t.failure(u, c),
            ),
          x.encode,
        ),
        (value: T) => {
          return `requires at least 1 and max 6 people, but ${typedKeysOf(value).reduce(
            (prev, cur) => (prev += PaxNumberIso.unwrap(value[cur])),
            0,
          )} were specified`
        },
      ),
    ),
  )
})

const PaxDefinition = merge(_PaxDefinition, {
  create: flow(
    // eslint-disable-next-line @typescript-eslint/unbound-method
    _PaxDefinition.type.decode,
    map((x) => x as PaxDefinition),
    mapLeft((x) => new ValidationError(decodeErrors(x))),
  ),
})

type PaxDefinitionType = t.TypeOf<typeof _PaxDefinition.type>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PaxDefinition extends PaxDefinitionType {}

export default PaxDefinition

// console.log(_PaxDefinition.type.decode({ adults: 1 }))

// console.log(
//   _PaxDefinition.type.decode({
//     adults: 7,
//     babies: 1,
//     children: 1,
//     infants: 0,
//     teenagers: 2,
//   }).left[0],
// )

// console.log(
//   _PaxDefinition.type.decode({
//     adults: 5,
//     children: 5,
//     babies: 0,
//     teenagers: 0,
//     infants: 0,
//   }),
// )

// const PaxNumberTemp = summon((F) =>
//   F.refined(
//     F.number(),
//     (n): n is t.Branded<PositiveInt, PaxNumberBrand> => n >= 0 && n <= 6,
//     "PaxNumber",
//     iotsConfig((x) =>
//       withBla(x, (value) => {
//         if (!PositiveInt.is(value)) {
//           return "Invalid input"
//         }
//         return `requires between 0 and max 6, but ${value} was specified.`
//       }),
//     ),
//   ),
// )

// console.log(PaxNumberTemp.type.decode(5))
// console.log(PaxNumberTemp.type.decode(10))
