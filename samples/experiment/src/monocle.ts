// import { Lens } from "monocle-ts"
// import { nonEmptyArray } from "fp-ts/lib/NonEmptyArray"
// const adults = Lens.fromPath<PaxDefinition>()(["adults"])
// const pax = PaxDefinition.create({
//   adults: 2,
//   children: 2,
//   infants: 1,
//   babies: 0,
//   teenagers: 0,
// })
// console.log(pax)
// const modified = adults.modify(() => 9)(pax.right)
// console.log(modified)
// console.log(PaxDefinition.validate(modified, []))

// const ne = nonEmptyArray.of("")
// ne[0].substring(0, 5)
// const nea = nonEmptyArray.of("a")
// nea.push("b")
// nea[1].substring(0, 5)
