import { assert, InvalidStateError, ValidationError } from "@fp-app/framework"
import { E, t, decodeErrors, withBla } from "@fp-app/fp-ts-extensions"
import TravelClassDefinition from "./TravelClassDefinition"
import { flow } from "fp-ts/lib/function"
import { merge } from "@fp-app/fp-ts-extensions/src/Io"
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

const _TravelClass = t.type({
  createdAt: t.date,
  templateId: t.string,
  name: TravelClassDefinition,
})

const create = ({ name, templateId }: { name: string; templateId: string }) => {
  return _TravelClass.decode({ createdAt: new Date(), name, templateId })
}
const _TravelClassExtensions = {
  create: flow(
    create,
    E.mapLeft(x => new ValidationError(decodeErrors(x))),
  ),
}
const TravelClass = merge(_TravelClass, _TravelClassExtensions)
type TravelClassType = t.TypeOf<typeof TravelClass>

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface TravelClass extends TravelClassType {}

export { TravelClass }

const Fields = t.type(
  {
    currentTravelClass: TravelClass,
    travelClasses: t.array(TravelClass),
  },
  "Fields",
)

type FieldsType = t.TypeOf<typeof Fields>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Fields extends FieldsType {}

export interface TripWithSelectedTravelClassBrand {
  readonly TripWithSelectedTravelClass: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

const _TripWithSelectedTravelClass = withBla(
  t.brand(
    Fields, // a codec representing the type to be refined
    (p): p is t.Branded<Fields, TripWithSelectedTravelClassBrand> =>
      // TODO: instead of ref equal we should compare by value
      p.travelClasses.some(x => x === p.currentTravelClass), // a custom type guard using the build-in helper `Branded`
    "TripWithSelectedTravelClass", // the name must match the readonly field in the brand
  ),
  value => {
    if (!Fields.is(value)) {
      return "Invalid input"
    }
    return `currentTravelClass must be one of travelClasses`
  },
)

const createTripWithSelectedTravelClass = ({
  travelClassName,
  trip,
}: {
  trip: Trip
  travelClassName: string
}) => {
  const selectedTravelClass = trip.travelClasses.find(x => x.name === travelClassName)
  return _TripWithSelectedTravelClass.decode({
    travelClasses: trip.travelClasses,
    currentTravelClass: selectedTravelClass,
  })
}

const _TripWithSelectedTravelClassExtensions = {
  create: flow(
    createTripWithSelectedTravelClass,
    E.mapLeft(x => new ValidationError(decodeErrors(x))),
  ),
}

const TripWithSelectedTravelClass = merge(
  _TripWithSelectedTravelClass,
  _TripWithSelectedTravelClassExtensions,
)

type TripWithSelectedTravelClassType = t.TypeOf<typeof TripWithSelectedTravelClass>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface TripWithSelectedTravelClass extends TripWithSelectedTravelClassType {}

export { TripWithSelectedTravelClass }
