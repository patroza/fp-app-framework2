import { flow, flip, tupled } from "fp-ts/lib/function"

export type ThenArg<T> = T extends Promise<infer U>
  ? U
  : T extends (...args: any[]) => Promise<infer V>
  ? V
  : T

export const toValue = <TNew>(value: TNew) => () => value
export const toVoid = toValue<void>(void 0)

// TODO: Should come with map already wrapped aroun it
export function tee<T, TDontCare>(
  f: (x: T) => Promise<TDontCare>,
): (input: T) => Promise<T>
export function tee<T, TDontCare>(f: (x: T) => TDontCare): (input: T) => T
export function tee(f: any) {
  return (input: any) => {
    const r = f(input)
    if (Promise.resolve(r) === r) {
      return r.then(() => input)
    } else {
      return input
    }
  }
}

export const regainType = <T, TOut>(f: (i: T) => TOut) => <T2 extends T>(i: T2) => f(i)

export const mapper = <T, TOut>(mapper: (i: T) => TOut) => <FOut>(
  f: (i: TOut) => FOut,
) => <T2 extends T>(i: T2) => f(mapper(i))

export function toMagicTup<T1, T2, T3>(
  input: readonly [[T1, T2], T3],
): readonly [T1, T2, T3]
export function toMagicTup([tup1, el]: any) {
  return tup1.concat([el])
}

export function apply<A, B>(a: A, f: (a: A) => B): B {
  return f(a)
}

export const applyIfNotUndefined = <T, TOutput>(
  input: T | undefined,
  f: (input: T) => TOutput,
): TOutput | undefined => {
  if (input === undefined) {
    return undefined
  }
  return f(input)
}

export const reverseApply = flow(flip, tupled)
