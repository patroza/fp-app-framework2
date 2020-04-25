import { summonFor } from "@morphic-ts/batteries/lib/summoner-ESBASTJ"
import { IoTsURI } from "@morphic-ts/io-ts-interpreters"
import { withMessage as WM } from "io-ts-types/lib/withMessage"
import { AType } from "@morphic-ts/batteries/lib/usage/utils"

import * as FW from "@fp-app/framework"
import { t, withBla, decodeErrors } from "@fp-app/fp-ts-extensions"
import { merge } from "@fp-app/fp-ts-extensions/src/Io"
import { flow } from "fp-ts/lib/function"
import { map, mapLeft, either } from "@fp-app/fp-ts-extensions/src/Either"

export const { summon } = summonFor<{
  [IoTsURI]: IoTsEnv
}>({
  [IoTsURI]: { WM, withBla },
})

interface IoTsEnv {
  WM: typeof WM
  withBla: typeof withBla
}

/* Pax: No domain validation, just primitives. **/
const Pax = t.type(
  {
    adults: t.number,
    babies: t.number,
    children: t.number,
    infants: t.number,
    teenagers: t.number,
  },
  "Pax",
)

// TODO: For Validation, we could brand any type as `readonly validated: unique symbol`...
// Think about the applications.

interface Pax extends t.TypeOf<typeof Pax> {}
export { Pax }

export interface PaxNumberBrand {
  readonly PaxNumber: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

const PaxNumber = summon((F) =>
  F.refined(
    F.number(),
    (n): n is t.Branded<number, PaxNumberBrand> => n >= 0 && n <= 6,
    "PaxNumber",
    {
      [IoTsURI]: (x, env) =>
        env.withBla(x, (value) => {
          return `requires a number between 0 and max 6, but ${value} was specified.`
        }),
    },
  ),
)

type PaxNumber = AType<typeof PaxNumber>

const _PaxDefinition = summon((F) => {
  type T = {
    adults: PaxNumber
    babies: PaxNumber
    children: PaxNumber
    infants: PaxNumber
    teenagers: PaxNumber
  }
  const validatePax = (p: T) =>
    FW.utils.typedKeysOf(p).some((k) => p[k] > 0) &&
    FW.utils.typedKeysOf(p).reduce((prev, cur) => (prev += p[cur]), 0) <= 6

  return F.interface(
    {
      adults: PaxNumber(F),
      babies: PaxNumber(F),
      children: PaxNumber(F),
      infants: PaxNumber(F),
      teenagers: PaxNumber(F),
    },
    "Pax",
    {
      [IoTsURI]: (x, env) =>
        env.withBla(
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
            return `requires at least 1 and max 6 people, but ${FW.utils
              .typedKeysOf(value)
              .reduce((prev, cur) => (prev += value[cur]), 0)} were specified`
          },
        ),
    },
  )
})

const PaxDefinition = merge(_PaxDefinition, {
  create: flow(
    // eslint-disable-next-line @typescript-eslint/unbound-method
    _PaxDefinition.type.decode,
    map((x) => x as PaxDefinition),
    mapLeft((x) => new FW.ValidationError(decodeErrors(x))),
  ),
})

interface PaxDefinition extends AType<typeof _PaxDefinition> {}

export default PaxDefinition

// console.log(PaxDefinition.type.decode({ adults: 1 }))

// console.log(PaxNumber.type.decode(9))

// console.log(
//   PaxDefinition.type.decode({
//     adults: 7,
//     babies: 1,
//     children: 1,
//     infants: 0,
//     teenagers: 2,
//   }).left[0],
// )

// console.log(
//   PaxDefinition.type.decode({
//     adults: 3,
//     children: 3,
//     babies: 0,
//     teenagers: 0,
//     infants: 0,
//   }),
// )

// console.log(
//   PaxDefinition.type.decode({
//     adults: 5,
//     children: 5,
//     babies: 0,
//     teenagers: 0,
//     infants: 0,
//   }),
// )
