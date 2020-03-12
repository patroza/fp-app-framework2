import { summon, AsOpaque } from "@morphic-ts/batteries/lib/summoner"
import { AType, EType } from "@morphic-ts/batteries/lib/usage/utils"

const Car_ = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("Car"),
      kind: F.keysOf({ electric: null, fuel: null, gaz: null }),
      power: F.number(),
    },
    "Car",
  ),
)
export type Car = AType<typeof Car_>
export type CarRaw = EType<typeof Car_>
export const Car = AsOpaque<CarRaw, Car>(Car_)
