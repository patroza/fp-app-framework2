import * as RE from "fp-ts/lib/ReaderEither"
export * from "fp-ts/lib/ReaderEither"

export const liftLeft = <TE>() => <T, TI, TE2 extends TE>(
  e: RE.ReaderEither<TI, TE2, T>,
) => e as RE.ReaderEither<TI, TE, T>

export const liftErr = liftLeft
