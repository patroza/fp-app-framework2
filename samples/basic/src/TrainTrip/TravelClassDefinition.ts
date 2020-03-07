import { ValidationError } from "@fp-app/framework"
import { E, t, pipe } from "@fp-app/fp-ts-extensions"

const _TravelClassDefinition = t.keyof({
  first: null,
  second: null,
  business: null,
  // etc...
})

const TravelClassDefinitionExtensions = {
  create: (name: string) =>
    pipe(
      TravelClassDefinition.decode(name),
      E.mapLeft(() => new ValidationError(`${name} is not a valid travel class name`)),
    ),
}

const TravelClassDefinition = {
  ..._TravelClassDefinition,
  ...TravelClassDefinitionExtensions,
} as typeof _TravelClassDefinition & typeof TravelClassDefinitionExtensions

type TravelClassDefinition = t.TypeOf<typeof TravelClassDefinition>

export default TravelClassDefinition
