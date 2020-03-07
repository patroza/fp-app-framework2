import * as RE from "fp-ts/lib/ReaderEither"
import { liftType } from "./general"
import { pipe } from "fp-ts/lib/pipeable"
export * from "fp-ts/lib/ReaderEither"

export const liftLeft = <TE>() => <T, TI, TE2 extends TE>(
  e: RE.ReaderEither<TI, TE2, T>,
) => pipe(e, RE.mapLeft(liftType<TE>()))

export const liftErr = liftLeft
