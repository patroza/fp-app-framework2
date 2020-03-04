import { assert, InvalidStateError } from "@fp-app/framework"
import { Result, pipe, E } from "@fp-app/fp-ts-extensions"
import { TemplateId } from "./TrainTrip"
import { TravelClassName } from "./TravelClassDefinition"

export default class Trip {
  static create = (serviceLevels: TravelClass[]) =>
    pipe(
      E.fromBool(serviceLevels, serviceLevels => !!serviceLevels.length),
      E.map(x => new Trip(x)),
      E.mapLeft(
        () => new InvalidStateError("A trip requires at least 1 service level"),
      ),
    )

  constructor(readonly travelClasses: TravelClass[]) {
    assert(Boolean(travelClasses.length), "A trip must have at least 1 travel class")
  }
}

export class TripWithSelectedTravelClass {
  static create(
    trip: Trip,
    travelClassName: TravelClassName,
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

  constructor(public templateId: TemplateId, public name: TravelClassName) {}
}
