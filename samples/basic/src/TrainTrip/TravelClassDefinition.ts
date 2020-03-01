import { ValidationError } from "@fp-app/framework"
import { E, boolToEither, pipe } from "@fp-app/fp-ts-extensions"

export default class TravelClassDefinition {
  static create = (name: string) =>
    pipe(
      boolToEither(name, name => validtravelClasses.some(x => x === name)),
      E.map(x => new TravelClassDefinition(x)),
      E.mapLeft(x => new ValidationError(`${x} is not a valid travel class name`)),
    )

  private constructor(readonly value: string) {}
}

const validtravelClasses = ["second", "first", "business"]

export type TravelClassName = "first" | "second" | "business"
