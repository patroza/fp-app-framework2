import { AType } from "@morphic-ts/batteries/lib/usage/utils"
import { ValidationError } from "@fp-app/framework"
import { pipe } from "@fp-app/fp-ts-extensions"
import { merge } from "@fp-app/fp-ts-extensions/src/Io"
import { mapLeft } from "@fp-app/fp-ts-extensions/src/Either"

import { summonFor } from "@morphic-ts/batteries/lib/summoner-ESBASTJ"

import { IoTsURI } from "@morphic-ts/io-ts-interpreters/lib"
import { withMessage as WM } from "io-ts-types/lib/withMessage"

export const { summon } = summonFor<{
  [IoTsURI]: IoTsEnv
}>({
  [IoTsURI]: { WM },
})

interface IoTsEnv {
  WM: typeof WM
}

const _TravelClassDefinition = summon((F) =>
  F.keysOf({ first: null, second: null, business: null }),
)

const createTravelClassDefinition = (name: string) =>
  pipe(
    _TravelClassDefinition.type.decode(name),
    mapLeft(() => new ValidationError(`${name} is not a valid travel class name`)),
  )

const TravelClassDefinition = merge(_TravelClassDefinition, {
  create: createTravelClassDefinition,
})

type TravelClassDefinition = AType<typeof TravelClassDefinition>

export default TravelClassDefinition
