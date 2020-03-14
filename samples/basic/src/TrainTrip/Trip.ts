import { ValidationError } from "@fp-app/framework"
import { E, t, decodeErrors, withBla, pipe } from "@fp-app/fp-ts-extensions"
import TravelClassDefinition from "./TravelClassDefinition"
import { flow } from "fp-ts/lib/function"
import { merge } from "@fp-app/fp-ts-extensions/src/Io"
// TODO: Value or Entity?

const _TravelClass = t.readonly(
  t.type({
    createdAt: t.date,
    templateId: t.NonEmptyString,
    name: TravelClassDefinition,
  }),
)

const createTravelClass = ({
  name,
  templateId,
}: {
  name: string
  templateId: string
}): E.Either<t.Errors, TravelClass> =>
  _TravelClass.decode({ createdAt: new Date(), name, templateId })

const fromWire = ({
  createdAt,
  name,
  templateId,
}: {
  createdAt: string
  name: string
  templateId: string
}): E.Either<t.Errors, TravelClass> =>
  pipe(
    t.DateFromISOString.decode(createdAt),
    E.chain(createdAt => _TravelClass.decode({ createdAt, name, templateId })),
  )

const TravelClass = merge(_TravelClass, {
  create: flow(
    createTravelClass,
    E.mapLeft(x => new ValidationError(decodeErrors(x))),
  ),
  fromWire,
})
type TravelClassType = t.TypeOf<typeof TravelClass>

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface TravelClass extends TravelClassType {}

export { TravelClass }

const _Trip = t.readonly(
  t.type({
    travelClasses: t.readonlyNonEmptyArray(TravelClass),
  }),
)

const createTrip = (travelClasses: TravelClass[]): E.Either<t.Errors, Trip> =>
  _Trip.decode({ travelClasses })
const Trip = merge(_Trip, {
  create: flow(
    createTrip,
    E.mapLeft(x => new ValidationError(decodeErrors(x))),
  ),
})
type TripType = t.TypeOf<typeof Trip>

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Trip extends TripType {}

export default Trip

const SelectedTravelClass = t.readonly(t.type({ currentTravelClass: TravelClass }))

const TripWithSelectedTravelClassFields = t.intersection(
  [SelectedTravelClass, Trip],
  "TripWithSelectedTravelClassFields",
)

type TripWithSelectedTravelClassFields = t.TypeOf<
  typeof TripWithSelectedTravelClassFields
>

export interface TripWithSelectedTravelClassBrand {
  readonly TripWithSelectedTravelClass: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

const _TripWithSelectedTravelClass = withBla(
  t.brand(
    TripWithSelectedTravelClassFields, // a codec representing the type to be refined
    (
      p,
    ): p is t.Branded<
      TripWithSelectedTravelClassFields,
      TripWithSelectedTravelClassBrand
    > =>
      // TODO: instead of ref equal we should compare by value
      p.travelClasses.some(x => x === p.currentTravelClass), // a custom type guard using the build-in helper `Branded`
    "TripWithSelectedTravelClass", // the name must match the readonly field in the brand
  ),
  value => {
    if (!TripWithSelectedTravelClassFields.is(value)) {
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
}): E.Either<t.Errors, TripWithSelectedTravelClass> => {
  const selectedTravelClass = trip.travelClasses.find(x => x.name === travelClassName)
  return _TripWithSelectedTravelClass.decode({
    travelClasses: trip.travelClasses,
    currentTravelClass: selectedTravelClass,
  })
}

const TripWithSelectedTravelClass = merge(_TripWithSelectedTravelClass, {
  create: flow(
    createTripWithSelectedTravelClass,
    E.mapLeft(x => new ValidationError(decodeErrors(x))),
  ),
})

type TripWithSelectedTravelClassType = t.TypeOf<typeof TripWithSelectedTravelClass>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface TripWithSelectedTravelClass extends TripWithSelectedTravelClassType {}

export { TripWithSelectedTravelClass }
