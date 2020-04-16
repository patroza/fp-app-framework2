export * from "./errors"
export * as utils from "./utils"
export * from "./infrastructure"
export * from "./types"
// Have to export them as is, without qualifiers
// because otherwise we get "Assertions require every name in the call target to be declared with an explicit type annotation."
export * from "./type-assertions"

// export interface Event {
//   readonly id: string
//   readonly createdAt: Date
// }
