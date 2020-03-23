import * as TO from "fp-ts-contrib/lib/TaskOption"
import { tee } from "./general"

export * from "fp-ts-contrib/lib/TaskOption"

const _do = <T>(func: (input: T) => void) => TO.map(tee(func))

export { _do as do }
