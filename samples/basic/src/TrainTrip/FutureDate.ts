import { ValidationError } from "@fp-app/framework"
import { E, pipe } from "@fp-app/fp-ts-extensions"

// Can use for input, but for storage we should just store as date.
// because it is temporal; what is today valid may be invalid tomorrow etc.
export default class FutureDate {
  static create = (date: Date) =>
    pipe(
      E.fromBool(date, isInFuture),
      E.bimap(
        d => new ValidationError(`${d.toDateString()} is not in future`),
        d => new FutureDate(d),
      ),
    )
  // Which is long for:
  // E.bimapFromBool(
  //   date,
  //   isInFuture,
  //   d => new ValidationError(`${d.toDateString()} is not in future`),
  //   d => new FutureDate(d),
  // )
  // ALT1
  // E.bimapFromBool2(
  //   isInFuture(date),
  //   () => new ValidationError(`${date.toDateString()} is not in future`),
  //   () => new FutureDate(date),
  // )
  // ALT2: will return disjointed Left and Right with `never` on either side.
  //  isInFuture(date)
  //  ? E.ok(date)
  //  : E.err(new ValidationError(`${date.toDateString()} is not in future`)
  // thats why we would use fromBool helper instead.

  private constructor(readonly value: Date) {}
}

const isInFuture = (date: Date) => date > new Date()

// // https://dev.to/gcanti/getting-started-with-fp-ts-either-vs-validation-5eja
// const a = compose(
//   FutureDate.create("2019-12-12"),
//   TE.mapLeft(toFieldError("startDate")),
// )

// const applicativeValidation = getApplicative(getArraySemigroup<string>())

// // const tup = sequenceT(a)
