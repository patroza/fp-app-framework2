import { Ord, fromCompare } from "fp-ts/lib/Ord"
import { contramap } from "fp-ts/lib/Ord"

const ordNumber: Ord<number> = fromCompare((x, y) => (x < y ? -1 : x > y ? 1 : 0))

function min<A>(O: Ord<A>): (x: A, y: A) => A {
  return (x, y) => (O.compare(x, y) === 1 ? y : x)
}

console.log(min(ordNumber)(2, 1)) // 1

type User = {
  name: string
  age: number
}
const byAge: Ord<User> = contramap((user: User) => user.age)(ordNumber)

const getYounger = min(byAge)

console.log(getYounger({ name: "Guido", age: 48 }, { name: "Giulio", age: 45 })) // { name: 'Giulio', age: 45 }

import { getDualOrd } from "fp-ts/lib/Ord"

function max<A>(O: Ord<A>): (x: A, y: A) => A {
  return min(getDualOrd(O))
}

const getOlder = max(byAge)

console.log(getOlder({ name: "Guido", age: 48 }, { name: "Giulio", age: 45 })) // { name: 'Guido', age: 48 }

import {
  getMeetSemigroup,
  getJoinSemigroup,
  Semigroup,
  semigroupSum,
} from "fp-ts/lib/Semigroup"

/** Takes the minimum of two values */
const semigroupMin: Semigroup<number> = getMeetSemigroup(ordNumber)

/** Takes the maximum of two values  */
const semigroupMax: Semigroup<number> = getJoinSemigroup(ordNumber)

semigroupMin.concat(2, 1) // 1
semigroupMax.concat(2, 1) // 2

type Point = {
  x: number
  y: number
}

// const semigroupPoint: Semigroup<Point> = {
//   concat: (p1, p2) => ({
//     x: semigroupSum.concat(p1.x, p2.x),
//     y: semigroupSum.concat(p1.y, p2.y),
//   }),
// }
import { getStructSemigroup } from "fp-ts/lib/Semigroup"

const semigroupPoint: Semigroup<Point> = getStructSemigroup({
  x: semigroupSum,
  y: semigroupSum,
})

type Vector = {
  from: Point
  to: Point
}

const semigroupVector: Semigroup<Vector> = getStructSemigroup({
  from: semigroupPoint,
  to: semigroupPoint,
})

import { getFunctionSemigroup, semigroupAll } from "fp-ts/lib/Semigroup"

/** `semigroupAll` is the boolean semigroup under conjunction */
const semigroupPredicate: Semigroup<(p: Point) => boolean> = getFunctionSemigroup(
  semigroupAll,
)<Point>()

const isPositiveX = (p: Point): boolean => p.x >= 0
const isPositiveY = (p: Point): boolean => p.y >= 0

const isPositiveXY = semigroupPredicate.concat(isPositiveX, isPositiveY)

console.log(
  isPositiveXY({ x: 1, y: 1 }), // true
  isPositiveXY({ x: 1, y: -1 }), // false
  isPositiveXY({ x: -1, y: 1 }), // false
  isPositiveXY({ x: -1, y: -1 }), // false
)

type Customer = {
  name: string
  favouriteThings: string[]
  registeredAt: number
  lastUpdatedAt: number
  hasMadePurchase: boolean
}

import { semigroupAny } from "fp-ts/lib/Semigroup"
import { getMonoid } from "fp-ts/lib/Array"

const semigroupCustomer: Semigroup<Customer> = getStructSemigroup({
  // keep the longer name
  name: getJoinSemigroup(contramap((s: string) => s.length)(ordNumber)),
  // accumulate things
  favouriteThings: getMonoid<string>(), // <= getMonoid returns a Semigroup for `Array<string>` see later
  // keep the least recent date
  registeredAt: getMeetSemigroup(ordNumber),
  // keep the most recent date
  lastUpdatedAt: getJoinSemigroup(ordNumber),
  // Boolean semigroup under disjunction
  hasMadePurchase: semigroupAny,
})

// folding?
console.log(
  semigroupCustomer.concat(
    {
      name: "Giulio",
      favouriteThings: ["math", "climbing"],
      registeredAt: new Date(2018, 1, 20).getTime(),
      lastUpdatedAt: new Date(2018, 2, 18).getTime(),
      hasMadePurchase: false,
    },
    {
      name: "Giulio Canti",
      favouriteThings: ["functional programming"],
      registeredAt: new Date(2018, 1, 22).getTime(),
      lastUpdatedAt: new Date(2018, 2, 9).getTime(),
      hasMadePurchase: true,
    },
  ),
)
/*
{ name: 'Giulio Canti',
  favouriteThings: [ 'math', 'climbing', 'functional programming' ],
  registeredAt: 1519081200000, // new Date(2018, 1, 20).getTime()
  lastUpdatedAt: 1521327600000, // new Date(2018, 2, 18).getTime()
  hasMadePurchase: true }
*/

import { getStructMonoid, monoidSum, Monoid } from "fp-ts/lib/Monoid"

const monoidPoint: Monoid<Point> = getStructMonoid({
  x: monoidSum,
  y: monoidSum,
})

const monoidVector: Monoid<Vector> = getStructMonoid({
  from: monoidPoint,
  to: monoidPoint,
})

import {
  fold,
  monoidProduct,
  monoidString,
  monoidAll,
  monoidAny,
} from "fp-ts/lib/Monoid"

fold(monoidSum)([1, 2, 3, 4]) // 10
fold(monoidProduct)([1, 2, 3, 4]) // 24
fold(monoidString)(["a", "b", "c"]) // 'abc'
fold(monoidAll)([true, false, true]) // false
fold(monoidAny)([true, false, true]) // true

import { getApplyMonoid, some, none } from "fp-ts/lib/Option"

const M = getApplyMonoid(monoidSum)

M.concat(some(1), none) // none
M.concat(some(1), some(2)) // some(3)
M.concat(some(1), M.empty) // some(1)

import { getFirstMonoid } from "fp-ts/lib/Option"

const M1 = getFirstMonoid<number>()

M1.concat(some(1), none) // some(1)
M1.concat(some(1), some(2)) // some(1)

import { getLastMonoid } from "fp-ts/lib/Option"

const M2 = getLastMonoid<number>()

M2.concat(some(1), none) // some(1)
M2.concat(some(1), some(2)) // some(2)

import { Option } from "fp-ts/lib/Option"

/** VSCode settings */
interface Settings {
  /** Controls the font family */
  fontFamily: Option<string>
  /** Controls the font size in pixels */
  fontSize: Option<number>
  /** Limit the width of the minimap to render at most a certain number of columns. */
  maxColumn: Option<number>
}

const monoidSettings: Monoid<Settings> = getStructMonoid({
  fontFamily: getLastMonoid<string>(),
  fontSize: getLastMonoid<number>(),
  maxColumn: getLastMonoid<number>(),
})

const workspaceSettings: Settings = {
  fontFamily: some("Courier"),
  fontSize: none,
  maxColumn: some(80),
}

const userSettings: Settings = {
  fontFamily: some("Fira Code"),
  fontSize: some(12),
  maxColumn: none,
}

/** userSettings overrides workspaceSettings */
monoidSettings.concat(workspaceSettings, userSettings)
/*
{ fontFamily: some("Fira Code"),
  fontSize: some(12),
  maxColumn: some(80) }
*/

import * as fc from "fast-check"

// Lawful, so doesnt throw
const S: Semigroup<string> = {
  concat: (x, y) => x + " " + y,
}
const associativity = (x: string, y: string, z: string) =>
  S.concat(S.concat(x, y), z) === S.concat(x, S.concat(y, z))
const arb: fc.Arbitrary<string> = fc.string()

it("my semigroup instance should be lawful", () => {
  fc.assert(fc.property(arb, arb, arb, associativity))
})

// Unlawful - should throw
const M3: Monoid<string> = {
  ...S,
  empty: "",
}
const rightIdentity = (x: string) => M3.concat(x, M3.empty) === x
const leftIdentity = (x: string) => M3.concat(M3.empty, x) === x

it("my monoid instance should be lawful", () => {
  expect(() => fc.assert(fc.property(arb, rightIdentity))).toThrowError()
  expect(() => fc.assert(fc.property(arb, leftIdentity))).toThrowError()
})
