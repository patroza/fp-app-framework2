export { default as DiskRecordContext } from "./RecordContext"
export { default as ReadContext } from "./ReadContext"
export * as utils from "./utils"

import { parse as parseOriginal, stringify } from "flatted"

const parse: <T>(input: string) => T = parseOriginal

export { parse, stringify }
