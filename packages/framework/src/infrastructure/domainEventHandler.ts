import { AsyncResult, TE, E, O } from "@fp-app/fp-ts-extensions"
import Event from "../event"
import { publishType } from "./mediator/publish"
import { generateKey, UnpackKey } from "./SimpleContainer"
import { TaskEither } from "fp-ts/lib/TaskEither"
import { eventsMapType, HandlerList } from "./executePostCommitHandlers"

// tslint:disable-next-line:max-classes-per-file
export default class DomainEventHandler {
  private events: Event[] = []
  private processedEvents: Event[] = []

  constructor(
    private readonly publish: publishType,
    private readonly getIntegrationHandlers: (evt: Event) => O.Option<HandlerList>,
    private readonly executeIntegrationEvents: UnpackKey<
      typeof executePostCommitHandlersKey
    >,
  ) {}

  commitAndPostEvents = async (
    getAndClearEvents: () => Event[],
    commit: () => Promise<void>,
  ) => {
    const execEvents = this.executeEvents(getAndClearEvents)
    const r = await execEvents()
    if (E.isErr(r)) {
      throw new Error("Domain event error: " + r.left)
    }
    await commit()
    this.publishIntegrationEvents()
  }

  private readonly executeEvents = (
    getAndClearEvents: () => Event[],
  ): TaskEither<Error, void> => async () => {
    // 1. pre-commit: post domain events
    // 2. commit!
    // 3. post-commit: post integration events

    this.processedEvents = []
    const updateEvents = () => (this.events = this.events.concat(getAndClearEvents()))
    updateEvents()
    let processedEvents: Event[] = []
    // loop until we have all events captured, event events of events.
    // lets hope we don't get stuck in stackoverflow ;-)
    while (this.events.length) {
      const events = this.events
      this.events = []
      processedEvents = processedEvents.concat(events)
      const publishTask = this.publishEvents(events)
      const r = await publishTask()
      if (E.isErr(r)) {
        this.events = processedEvents
        return E.err(r.left)
      }
      updateEvents()
    }
    this.processedEvents = processedEvents
    return E.success()
  }

  private readonly publishEvents = (events: Event[]): AsyncResult<void, Error> =>
    TE.chainTasks(events.map(e => this.publish(e)))

  private readonly publishIntegrationEvents = () => {
    this.events = []
    const integrationEventsMap = new Map<Event, HandlerList>()
    for (const evt of this.processedEvents) {
      const integrationEventHandlers = this.getIntegrationHandlers(evt)
      if (O.isNone(integrationEventHandlers)) {
        continue
      }
      integrationEventsMap.set(evt, integrationEventHandlers.value)
    }
    if (integrationEventsMap.size) {
      this.executeIntegrationEvents(integrationEventsMap)
    }
    this.processedEvents = []
  }
}

export const executePostCommitHandlersKey = generateKey<
  (eventMap: eventsMapType) => void
>("executePostCommitHandlers")
