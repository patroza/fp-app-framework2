import * as t from "io-ts"
import { fromArray } from "fp-ts/lib/NonEmptyArray"
import { isNonEmpty } from "fp-ts/lib/Array"
import { either } from "@matechs/prelude/lib/either"
import { isNone } from "fp-ts/lib/Option"
import { ReadonlyNonEmptyArray } from "fp-ts/lib/ReadonlyNonEmptyArray"

export interface ReadonlyNonEmptyArrayC<C extends t.Mixed>
  extends t.Type<
    ReadonlyNonEmptyArray<t.TypeOf<C>>,
    ReadonlyNonEmptyArray<t.OutputOf<C>>,
    unknown
  > {}

export function readonlyNonEmptyArray<C extends t.Mixed>(
  codec: C,
  name = `ReadonlyNonEmptyArray<${codec.name}>`,
): ReadonlyNonEmptyArrayC<C> {
  const arr = t.array(codec)
  const narr = t.readonlyArray(codec)
  return new t.Type(
    name,
    (u): u is ReadonlyNonEmptyArray<t.TypeOf<C>> => arr.is(u) && isNonEmpty(u),
    (u, c) =>
      either.chain(arr.validate(u, c), (as) => {
        const onea = fromArray(as)
        return isNone(onea) ? t.failure(u, c) : t.success(onea.value)
      }),
    (nea) => narr.encode(nea) as any, // TODO
  )
}
