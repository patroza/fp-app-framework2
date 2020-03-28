import { benchLog, getLogger } from "../utils"
import {
  requestInNewScopeType,
  requestInNewScopeKey,
  NamedHandlerWithDependencies,
} from "./mediator"
import { pipe, TE, ReadonlyNonEmptyArray } from "@fp-app/fp-ts-extensions"
import Event from "../event"
import { configure } from "./configure"

const logger = getLogger("executePostCommitHandlers")

const executePostCommitHandlers = configure(
  ({ executeIntegrationEvent }) => (eventsMap: eventsMapType) =>
    process.nextTick(() =>
      tryProcessEvents(executeIntegrationEvent, eventsMap).catch(err =>
        logger.error("Unexpected error during applying IntegrationEvents", err),
      ),
    ),
  () => ({ executeIntegrationEvent: requestInNewScopeKey }),
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

export type HandlerList = ReadonlyNonEmptyArray<NamedHandlerWithDependencies>

export default executePostCommitHandlers
