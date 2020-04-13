import { AsyncResult, TE, E } from "@fp-app/fp-ts-extensions"
import { TaskEither } from "fp-ts/lib/TaskEither"
import { Event, publishType } from "@fp-app/framework"

// tslint:disable-next-line:max-classes-per-file
export default class DomainEventHandler {
  private events: Event[] = []
  private processedEvents: Event[] = []

  constructor(
    private readonly publish: publishType,
    private readonly executeIntegrationEvents: publishType,
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
    const r2 = await this.publishIntegrationEvents()
    if (E.isErr(r2)) {
      throw new Error("integration event error: " + r2.left)
    }
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
    TE.chainTasks(events.map((e) => this.publish(e)))
  private readonly publishIntegrationEventsInt = (
    events: Event[],
  ): AsyncResult<void, Error> =>
    TE.chainTasks(events.map((e) => this.executeIntegrationEvents(e)))

  private readonly publishIntegrationEvents = async () => {
    this.events = []
    const r = await this.publishIntegrationEventsInt(this.processedEvents)()
    this.processedEvents = []

    return r
  }
}
