import { tagged } from "@morphic-ts/batteries/lib/summoner-no-union"

import { Car, Bicycle, Person } from "./morphic"

it("works", () => {
  // You now have acces to everything to develop around this Type
  console.log(Person.build({ name: "dude", age: 125 })) // basic build function (enforcing correct type)
  console.log(Person.show) // Show from fp-ts
  console.log(Person.type) // io-ts
  console.log(Person.strictType) // io-ts
  console.log(Person.eq) // Eq from fp-ts
  console.log(
    Person.lenseFromPath(["name"]).modify(x => x + "222")({ name: "a", age: 1 }),
  ) // and other optics (optionnals, prism, ) from monocle-ts
  console.log(Person.arb) // fast-check
  console.log(JSON.stringify(Person.jsonSchema, undefined, 2)) // JsonSchema-ish representation
})

const Vehicule = tagged("type")({ Car, Bicycle })
