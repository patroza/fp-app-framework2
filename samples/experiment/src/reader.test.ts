import { Reader } from "fp-ts/lib/Reader"
import { pipe } from "fp-ts/lib/pipeable"

//const f = (b: boolean): string => (b ? 'true' : 'false')
// const f = (b: boolean, deps: Dependencies): string =>
//   b ? deps.i18n.true : deps.i18n.false

// const g = (n: number): string => f(n > 2)

// const h = (s: string): string => g(s.length + 1)

const f = (b: boolean): Reader<Dependencies, string> => deps =>
  b ? deps.i18n.true : deps.i18n.false

// const g = (n: number): Reader<Dependencies, string> => f(n > 2)
import { ask, chain } from "fp-ts/lib/Reader"

const g = (n: number): Reader<Dependencies, string> =>
  pipe(
    ask<Dependencies>(),
    chain(deps => f(n > deps.lowerBound)),
  )

const h = (s: string): Reader<Dependencies, string> => g(s.length + 1)

const instance: Dependencies = {
  i18n: {
    true: "vero",
    false: "falso",
  },
  lowerBound: 2,
}

console.log(h("foo")(instance)) // 'true'

interface Dependencies {
  i18n: {
    true: string
    false: string
  }
  lowerBound: number
}
