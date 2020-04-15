import { effect as T, freeEnv as F } from "@matechs/effect"
import * as O from "fp-ts/lib/Option"
import { T as Task, TE, E, RE, RTE } from "@fp-app/fp-ts-extensions"

export { F, T, O, Task, TE, E, RE, RTE }

export const liftEitherSuspended = <TArgs extends any[], E, A>(
  e: (...args: TArgs) => E.Either<E, A>,
) => (...args: TArgs) => T.suspended(() => T.fromEither(e(...args)))
