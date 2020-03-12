import { summon } from "@morphic-ts/batteries/lib/summoner"
import { fastCheckConfig } from "@morphic-ts/fastcheck-interpreters"

export const Person = summon(F =>
  F.interface(
    {
      name: F.string(),
      age: F.number(),
      blas: F.nullable(F.array(F.string(), fastCheckConfig(undefined))),
    },
    "Person",
  ),
)

export const Bicycle = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("Bicycle"),
      color: F.string(),
    },
    "Bicycle",
  ),
)

export const Car = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("Car"),
      kind: F.keysOf({ electric: null, fuel: null, gaz: null }),
      power: F.number(),
    },
    "Car",
  ),
)
