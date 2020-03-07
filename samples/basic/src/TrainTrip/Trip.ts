import { assert, InvalidStateError } from "@fp-app/framework"
import { Result, E } from "@fp-app/fp-ts-extensions"
import { TemplateId } from "./TrainTrip"
import TravelClassDefinition from "./TravelClassDefinition"
// TODO: Value or Entity?

export default class Trip {
  static create = (serviceLevels: TravelClass[]) =>
    E.bimapFromBool2(
      !!serviceLevels.length,
      () => new InvalidStateError("A trip requires at least 1 service level"),
      () => new Trip(serviceLevels),
    )

  // ALT
  // E.bimapFromBool(
  //   serviceLevels,
  //   serviceLevels => !!serviceLevels.length,
  //   () => new InvalidStateError("A trip requires at least 1 service level"),
  //   x => new Trip(x),
  // )
  // is in fact:
  // pipe(
  //   E.fromBool(serviceLevels, serviceLevels => !!serviceLevels.length),
  //   E.bimap(
  //     () => new InvalidStateError("A trip requires at least 1 service level"),
  //     x => new Trip(x),
  //   ),
  // )

  private constructor(readonly travelClasses: TravelClass[]) {
    assert(Boolean(travelClasses.length), "A trip must have at least 1 travel class")
  }
}

export class TripWithSelectedTravelClass {
  static create(
    trip: Trip,
    travelClassName: TravelClassDefinition,
  ): Result<TripWithSelectedTravelClass, InvalidStateError> {
    const selectedTravelClass = trip.travelClasses.find(x => x.name === travelClassName)
    if (!selectedTravelClass) {
      return E.err(new InvalidStateError("The service level is not available"))
    }
    return E.ok(
      new TripWithSelectedTravelClass(trip.travelClasses, selectedTravelClass),
    )
  }
  private constructor(
    readonly travelClasses: TravelClass[],
    readonly currentTravelClass: TravelClass,
  ) {}
}

export class TravelClass {
  readonly createdAt = new Date()

  constructor(public templateId: TemplateId, public name: TravelClassDefinition) {}
}
