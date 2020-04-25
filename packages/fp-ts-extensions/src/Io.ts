export * from "io-ts"

export const merge = <T1, T2>(t1: T1, t2: T2) => ({
  ...t1,
  ...t2,
})
