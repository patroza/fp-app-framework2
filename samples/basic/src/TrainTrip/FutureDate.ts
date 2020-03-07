import * as t from "io-ts"

const date = new t.Type<Date, Date, Date>(
  "Date",
  (input: unknown): input is Date => input instanceof Date,
  // `t.success` and `t.failure` are helpers used to build `Either` instances
  (input, context) => t.success(input),
  // `A` and `O` are the same, so `encode` is just the identity function
  t.identity,
)

// a unique brand for positive numbers
interface FutureDate2Brand {
  readonly Future: unique symbol // use `unique symbol` here to ensure uniqueness across modules / packages
}

export const FutureDate = t.brand(
  date, // a codec representing the type to be refined
  (n): n is t.Branded<Date, FutureDate2Brand> => isInFuture(n), // a custom type guard using the build-in helper `Branded`
  "Future", // the name must match the readonly field in the brand
)

export type FutureDate = t.TypeOf<typeof FutureDate>

export default FutureDate

const isInFuture = (date: Date) => date > new Date()

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
