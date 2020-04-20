import { freeEnv as Free } from "@matechs/effect"
import * as O from "fp-ts/lib/Option"
import { T as Task, TE, E, RE, RTE, T } from "@fp-app/fp-ts-extensions"
export * from "@matechs/prelude"
export { Free, O, Task, TE, E, RE, RTE }

export const liftEitherSuspended = <TArgs extends any[], E, A>(
  e: (...args: TArgs) => E.Either<E, A>,
) => (...args: TArgs) => T.suspended(() => T.fromEither(e(...args)))
