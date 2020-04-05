import { summon } from "@morphic-ts/batteries/lib/summoner-ESBASTJ"
import { ValidationError } from "@fp-app/framework"
import { t, pipe } from "@fp-app/fp-ts-extensions"
import { merge } from "@fp-app/fp-ts-extensions/src/Io"
import { mapLeft } from "@fp-app/fp-ts-extensions/src/Either"

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

type TravelClassDefinition = t.TypeOf<typeof TravelClassDefinition.type>

export default TravelClassDefinition
