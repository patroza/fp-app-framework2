import { flow } from "fp-ts/lib/function"
import { t, withBla, decodeErrors } from "@fp-app/fp-ts-extensions"
import { ValidationError } from "@fp-app/framework"
import { merge } from "@fp-app/fp-ts-extensions/src/Io"
import { map, mapLeft } from "@fp-app/fp-ts-extensions/src/Either"

// TODO: not pure ;-)
const isInFuture = (date: Date) => date > new Date()

// a unique brand for positive numbers
export interface FutureDate2Brand {
  readonly FutureDate: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

export const _FutureDate = withBla(
  t.brand(
    t.DateFromISOString, // a codec representing the type to be refined
    (n): n is t.Branded<Date, FutureDate2Brand> => isInFuture(n), // a custom type guard using the build-in helper `Branded`
    "FutureDate", // the name must match the readonly field in the brand
  ),
  (value) => {
    if (!t.DateFromISOString.is(value)) {
      return "invalid value"
    }
    return `${value.toDateString()} is not in the Future`
  },
)

const FutureDate = merge(_FutureDate, {
  create: flow(
    // eslint-disable-next-line @typescript-eslint/unbound-method
    _FutureDate.decode,
    map((x) => x as FutureDate),
    mapLeft((x) => new ValidationError(decodeErrors(x))),
  ),
})

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FutureDate extends t.TypeOf<typeof _FutureDate> {}

export default FutureDate
