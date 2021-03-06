import { Event } from "@fp-app/framework-classic"
import { E } from "@fp-app/fp-ts-extensions"

export const captureEventsEither = <TE, TEvent extends Event, TArgs extends unknown[]>(
  func: (...args: TArgs) => E.Either<TE, readonly TEvent[]>,
  registerDomainEvent: (evt: Event) => void,
) => (...args: TArgs) =>
  E.either.map(func(...args), (evts) => evts.forEach(registerDomainEvent))

export const captureEvents = <TEvent extends Event, TArgs extends unknown[]>(
  func: (...args: TArgs) => readonly TEvent[],
  registerDomainEvent: (evt: Event) => void,
) => (...args: TArgs) => func(...args).forEach(registerDomainEvent)

export const unwrapResultEither = <This, TE, T, T2, TArgs extends unknown[]>(
  t: This,
  func: (t: This) => (...args: TArgs) => E.Either<TE, readonly [T, T2]>,
) => (...args: TArgs) =>
  E.either.map(func(t)(...args), ([newT, r]) => {
    // this unifies the FP and OO world right now
    Object.assign(t, newT)
    return r
  })

export const unwrapResult = <This, T, T2, TArgs extends unknown[]>(
  t: This,
  func: (t: This) => (...args: TArgs) => readonly [T, T2],
) => (...args: TArgs) => {
  // this unifies the FP and OO world right now
  const [newT, r] = func(t)(...args)
  Object.assign(t, newT)
  return r
}
