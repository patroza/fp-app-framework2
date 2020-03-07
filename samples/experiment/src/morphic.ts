import { summon } from "@morphic-ts/batteries/lib/summoner"

export const Person = summon(F =>
  F.interface(
    {
      name: F.string(),
      age: F.number(),
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
