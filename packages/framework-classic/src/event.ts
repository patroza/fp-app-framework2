import { utils } from "@fp-app/framework"

export default abstract class Event {
  readonly id = utils.generateShortUuid()
  readonly createdAt = new Date()
}
