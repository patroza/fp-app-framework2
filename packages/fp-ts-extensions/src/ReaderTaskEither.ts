import * as RTE from "fp-ts/lib/ReaderTaskEither"
import { liftType } from "./general"
import { pipe } from "fp-ts/lib/pipeable"
export * from "fp-ts/lib/ReaderTaskEither"

export const liftLeft = <TE>() => <T, TI, TE2 extends TE>(
  e: RTE.ReaderTaskEither<TI, TE2, T>,
) => pipe(e, RTE.mapLeft(liftType<TE>()))

export const liftErr = liftLeft
