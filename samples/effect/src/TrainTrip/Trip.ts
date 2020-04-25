import { ValidationError } from "@fp-app/framework"
import { decodeErrors, withBla, pipe, I, IT } from "@fp-app/fp-ts-extensions"
import TravelClassDefinition from "./TravelClassDefinition"
import { flow } from "fp-ts/lib/function"
import { merge } from "@fp-app/fp-ts-extensions/src/Io"
import { mapLeft, Either, chain } from "@fp-app/fp-ts-extensions/src/Either"
// TODO: Value or Entity?

const _TravelClass = I.readonly(
  I.type({
    createdAt: IT.date.date,
    templateId: IT.NonEmptyString.NonEmptyString,
    name: TravelClassDefinition.type,
  }),
)

const fromWire = ({
  createdAt,
  name,
  templateId,
}: {
  createdAt: string
  name: string
  templateId: string
}): Either<I.Errors, TravelClass> =>
  pipe(
    IT.DateFromISOString.DateFromISOString.decode(createdAt),
    chain((createdAt) => _TravelClass.decode({ createdAt, name, templateId })),
  )

const TravelClass = merge(_TravelClass, {
  create: flow(
    // eslint-disable-next-line @typescript-eslint/unbound-method
    _TravelClass.decode,
    mapLeft((x) => new ValidationError(decodeErrors(x))),
  ),
  fromWire,
})

interface TravelClass extends I.TypeOf<typeof TravelClass> {}

export { TravelClass }

const _Trip = I.readonly(
  I.type({
    travelClasses: IT.readonlyNonEmptyArray(TravelClass),
  }),
)

const createTrip = (travelClasses: TravelClass[]): Either<I.Errors, Trip> =>
  _Trip.decode({ travelClasses })
const Trip = merge(_Trip, {
  create: flow(
    createTrip,
    mapLeft((x) => new ValidationError(decodeErrors(x))),
  ),
})

interface Trip extends I.TypeOf<typeof Trip> {}

export default Trip

const SelectedTravelClass = I.readonly(I.type({ currentTravelClass: TravelClass }))

const TripWithSelectedTravelClassFields = I.intersection(
  [SelectedTravelClass, Trip],
  "TripWithSelectedTravelClassFields",
)

type TripWithSelectedTravelClassFields = I.TypeOf<
  typeof TripWithSelectedTravelClassFields
>

export interface TripWithSelectedTravelClassBrand {
  readonly TripWithSelectedTravelClass: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

const _TripWithSelectedTravelClass = withBla(
  I.brand(
    TripWithSelectedTravelClassFields, // a codec representing the type to be refined
    (
      p,
    ): p is I.Branded<
      TripWithSelectedTravelClassFields,
      TripWithSelectedTravelClassBrand
    > =>
      // TODO: instead of ref equal we should compare by value
      p.travelClasses.some((x) => x === p.currentTravelClass), // a custom type guard using the build-in helper `Branded`
    "TripWithSelectedTravelClass", // the name must match the readonly field in the brand
  ),
  (value) => {
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
}): Either<I.Errors, TripWithSelectedTravelClass> => {
  const selectedTravelClass = trip.travelClasses.find((x) => x.name === travelClassName)
  return _TripWithSelectedTravelClass.decode({
    travelClasses: trip.travelClasses,
    currentTravelClass: selectedTravelClass,
  })
}

const TripWithSelectedTravelClass = merge(_TripWithSelectedTravelClass, {
  create: flow(
    createTripWithSelectedTravelClass,
    mapLeft((x) => new ValidationError(decodeErrors(x))),
  ),
})

interface TripWithSelectedTravelClass
  extends I.TypeOf<typeof TripWithSelectedTravelClass> {}

export { TripWithSelectedTravelClass }
