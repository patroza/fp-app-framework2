import { ValidationError } from "@fp-app/framework"
import { E } from "@fp-app/fp-ts-extensions"

export default class TravelClassDefinition {
  static create = (name: string) =>
    E.bimapFromBool2(
      validtravelClasses.some(x => x === name),
      () => new ValidationError(`${name} is not a valid travel class name`),
      () => new TravelClassDefinition(name),
    )
  // ALT:
  // E.bimapFromBool(
  //   name,
  //   name => validtravelClasses.some(x => x === name),
  //   x => new ValidationError(`${x} is not a valid travel class name`),
  //   x => new TravelClassDefinition(x),
  // )
  // Is in fact:
  // pipe(
  //   E.fromBool(name, name => validtravelClasses.some(x => x === name), x => new ValidationError(`${x} is not a valid travel class name`), x => new TravelClassDefinition(x)),
  //   E.bimap(
  //     x => new ValidationError(`${x} is not a valid travel class name`),
  //     x => new TravelClassDefinition(x)
  //   ),
  // )

  private constructor(readonly value: string) {}
}

const validtravelClasses = ["second", "first", "business"]

export type TravelClassName = "first" | "second" | "business"
