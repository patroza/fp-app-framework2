import { benchLog, getLogger } from "../utils"
import { NamedHandlerWithDependencies, requestInNewScopeType } from "./mediator"
import { pipe, TE, ReadonlyNonEmptyArray } from "@fp-app/fp-ts-extensions"
import Event from "../event"

const logger = getLogger("executePostCommitHandlers")

const executePostCommitHandlers = ({
  executeIntegrationEvent,
}: {
  executeIntegrationEvent: requestInNewScopeType
}) => (eventsMap: eventsMapType) =>
  process.nextTick(() =>
    tryProcessEvents(executeIntegrationEvent, eventsMap).catch(err =>
      logger.error("Unexpected error during applying IntegrationEvents", err),
    ),
  )

async function tryProcessEvents(
  executeIntegrationEvent: requestInNewScopeType,
  eventsMap: eventsMapType,
) {
  for (const [evt, hndlrs] of eventsMap.entries()) {
    for (const pch of hndlrs) {
      await benchLog(
        pipe(
          executeIntegrationEvent(pch, evt),
          TE.mapLeft(err =>
            logger.warn(`Error during applying IntegrationEvents`, err),
          ),
        ),
        "postCommitHandler",
      )
    }
  }
}

export type eventsMapType = Map<Event, HandlerList>

export type HandlerList = ReadonlyNonEmptyArray<
  NamedHandlerWithDependencies<any, any, any, any>
>

export default executePostCommitHandlers
