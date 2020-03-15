import { flow } from "fp-ts/lib/function"
import { E, t, withBla, decodeErrors } from "@fp-app/fp-ts-extensions"
import { ValidationError } from "@fp-app/framework"
import { merge } from "@fp-app/fp-ts-extensions/src/Io"

const isInFuture = (date: Date) => date > new Date()

// a unique brand for positive numbers
export interface FutureDate2Brand {
  readonly FutureDate: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

export const _FutureDate = withBla(
  t.brand(
    t.date, // a codec representing the type to be refined
    (n): n is t.Branded<Date, FutureDate2Brand> => isInFuture(n), // a custom type guard using the build-in helper `Branded`
    "FutureDate", // the name must match the readonly field in the brand
  ),
  value => {
    if (!t.date.is(value)) {
      return "invalid value"
    }
    return `${value.toDateString()} is not in the Future`
  },
)

const FutureDate = merge(_FutureDate, {
  create: flow(
    _FutureDate.decode,
    E.map(x => x as FutureDate),
    E.mapLeft(x => new ValidationError(decodeErrors(x))),
  ),
})

type FutureDateType = t.TypeOf<typeof _FutureDate>
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FutureDate extends FutureDateType {}

export default FutureDate

// // https://dev.to/gcanti/getting-started-with-fp-ts-either-vs-validation-5eja
// const a = compose(
//   FutureDate.create("2019-12-12"),
//   TE.mapLeft(toFieldError("startDate")),
// )

// const applicativeValidation = getApplicative(getArraySemigroup<string>())

// // const tup = sequenceT(a)
