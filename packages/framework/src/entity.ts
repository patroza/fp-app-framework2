import Event from "./event"
import { Writeable } from "./utils"
import { eqString, contramap } from "fp-ts/lib/Eq"

/**
 * - An Entity has an Identifier. Unlike a Value.
 * - An Entity is considered equal when of the same type and Identifier matches.
 * - An Entity is usually constructed through a Factory, e.g static create()
 *   and has a private constructor. The factory returns an Either<Error,{TypeOfEntity}>
 *   documenting the various Errors that may occur constructing the Entity.
 */
export default abstract class Entity {
  private events: Event[] = []

  constructor(readonly id: string) {
    // workaround so that we can make props look readonly on the outside, but allow to change on the inside.
    // doesn't work if assigned as property :/
    Object.defineProperty(this, "w", { value: this })
  }
  protected get w() {
    return this as Writeable<this>
  }

  readonly intGetAndClearEvents = () => {
    const events = this.events
    this.events = []
    return events
  }

  protected registerDomainEvent = (evt: Event) => {
    this.events.push(evt)
  }

  /**
   * An entity of the same type is equal to this entity when it's ID match
   * Note: Does not take inheritance into account. Strict constructor check.
   */
  public readonly equals = (e2: Entity) =>
    this.constructor === e2.constructor && eqEntity.equals(this, e2)
}

const eqEntity = contramap((e: Entity) => e.id)(eqString)
