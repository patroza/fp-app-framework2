import * as t from "io-ts"
import { flow } from "fp-ts/lib/function"
import { E, withBla, decodeErrors } from "@fp-app/fp-ts-extensions"
import { ValidationError } from "@fp-app/framework"

const isInFuture = (date: Date) => date > new Date()

const date = new t.Type<Date, Date, Date>(
  "Date",
  (input): input is Date => input instanceof Date,
  // `t.success` and `t.failure` are helpers used to build `Either` instances
  input => t.success(input),
  // `A` and `O` are the same, so `encode` is just the identity function
  t.identity,
)

// a unique brand for positive numbers
export interface FutureDate2Brand {
  readonly FutureDate: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

export const _FutureDate = withBla(
  t.brand(
    date, // a codec representing the type to be refined
    (n): n is t.Branded<Date, FutureDate2Brand> => isInFuture(n), // a custom type guard using the build-in helper `Branded`
    "FutureDate", // the name must match the readonly field in the brand
  ),
  value => {
    if (!date.is(value)) {
      return "invalid value"
    }
    return `${value.toDateString()} is not in the Future`
  },
)

const FutureDateExtension = {
  create: flow(
    _FutureDate.decode,
    E.mapLeft(x => new ValidationError(decodeErrors(x))),
  ),
}

const FutureDate = {
  ..._FutureDate,
  ...FutureDateExtension,
} as typeof _FutureDate & typeof FutureDateExtension

type FutureDate = t.TypeOf<typeof FutureDate>

export default FutureDate

// // https://dev.to/gcanti/getting-started-with-fp-ts-either-vs-validation-5eja
// const a = compose(
//   FutureDate.create("2019-12-12"),
//   TE.mapLeft(toFieldError("startDate")),
// )

// const applicativeValidation = getApplicative(getArraySemigroup<string>())

// // const tup = sequenceT(a)

// import { Value, ValidationError } from "@fp-app/framework"
// import { pipe } from "fp-ts/lib/pipeable"
// import { E } from "@fp-app/fp-ts-extensions"

// export default class FutureDate extends Value {
//   static create = (date: Date) =>
//     pipe(
//       _FutureDate.decode(date),
//       E.bimap(
//         e => new ValidationError(e.join(", ")),
//         d => new FutureDate(d),
//       ),
//     )
//   // Which is long for:
//   // E.bimapFromBool(
//   //   date,
//   //   isInFuture,
//   //   d => new ValidationError(`${d.toDateString()} is not in future`),
//   //   d => new FutureDate(d),
//   // )
//   // ALT1
//   // E.bimapFromBool2(
//   //   isInFuture(date),
//   //   () => new ValidationError(`${date.toDateString()} is not in future`),
//   //   () => new FutureDate(date),
//   // )
//   // ALT2: will return disjointed Left and Right with `never` on either side.
//   //  isInFuture(date)
//   //  ? E.ok(date)
//   //  : E.err(new ValidationError(`${date.toDateString()} is not in future`)
//   // thats why we would use fromBool helper instead.

//   private constructor(readonly value: Date) {
//     super()
//   }
// }

// const _FutureDate = new t.Type<Date, Date, Date>(
//   "FutureDate",
//   (input: unknown): input is Date => input instanceof Date,
//   // `t.success` and `t.failure` are helpers used to build `Either` instances
//   (input, context) =>
//     isInFuture(input)
//       ? t.success(input)
//       : t.failure(input, context, `${input.toDateString()} is not in the Future`),
//   // `A` and `O` are the same, so `encode` is just the identity function
//   t.identity,
// )

// type _FutureDate = t.TypeOf<typeof _FutureDate>
// Can use for input, but for storage we should just store as date.
// because it is temporal; what is today valid may be invalid tomorrow etc.
// export default class FutureDate extends Value {
//   static create = (date: Date) =>
//     pipe(
//       E.fromBool(date, isInFuture),
//       E.bimap(
//         d => new ValidationError(`${d.toDateString()} is not in future`),
//         d => new FutureDate(d),
//       ),
//     )
//   // Which is long for:
//   // E.bimapFromBool(
//   //   date,
//   //   isInFuture,
//   //   d => new ValidationError(`${d.toDateString()} is not in future`),
//   //   d => new FutureDate(d),
//   // )
//   // ALT1
//   // E.bimapFromBool2(
//   //   isInFuture(date),
//   //   () => new ValidationError(`${date.toDateString()} is not in future`),
//   //   () => new FutureDate(date),
//   // )
//   // ALT2: will return disjointed Left and Right with `never` on either side.
//   //  isInFuture(date)
//   //  ? E.ok(date)
//   //  : E.err(new ValidationError(`${date.toDateString()} is not in future`)
//   // thats why we would use fromBool helper instead.

//   private constructor(readonly value: Date) {
//     super()
//   }
// }
