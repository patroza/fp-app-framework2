import { sequenceT } from "fp-ts/lib/Apply"
import { Either, getValidation, left, map, mapLeft, right } from "fp-ts/lib/Either"
import { getSemigroup, NonEmptyArray } from "fp-ts/lib/NonEmptyArray"
import { pipe } from "fp-ts/lib/pipeable"

const minLength = (s: string): Either<string, string> =>
  s.length >= 6 ? right(s) : left("at least 6 characters")

const oneCapital = (s: string): Either<string, string> =>
  /[A-Z]/g.test(s) ? right(s) : left("at least one capital letter")

const oneNumber = (s: string): Either<string, string> =>
  /[0-9]/g.test(s) ? right(s) : left("at least one number")

function lift<L, A>(
  check: (a: A) => Either<L, A>,
): (a: A) => Either<NonEmptyArray<L>, A> {
  return a =>
    pipe(
      check(a),
      mapLeft(a => [a]),
    )
}

function validatePassword(s: string): Either<NonEmptyArray<string>, string> {
  return pipe(
    sequenceT(getValidation(getSemigroup<string>()))(
      lift(minLength)(s),
      lift(oneCapital)(s),
      lift(oneNumber)(s),
    ),
    map(() => s),
  )
}

console.log(validatePassword("ab"))
/*
=> left([ 'at least 6 characters',
    'at least one capital letter',
    'at least one number' ])
*/
