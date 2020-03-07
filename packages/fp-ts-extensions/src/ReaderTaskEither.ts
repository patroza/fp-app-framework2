import * as RTE from "fp-ts/lib/ReaderTaskEither"
export * from "fp-ts/lib/ReaderTaskEither"

export const liftLeft = <TE>() => <T, TI, TE2 extends TE>(
  e: RTE.ReaderTaskEither<TI, TE2, T>,
) => e as RTE.ReaderTaskEither<TI, TE, T> // pipe(e, RTE.mapLeft(liftType<TE>()))

export const liftErr = liftLeft
