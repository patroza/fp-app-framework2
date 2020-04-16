import { Do } from "@fp-app/fp-ts-extensions"
import { T } from "@e/meffect"
import * as FW from "@fp-app/framework"
import { handlers, parseEvent } from "./eventhandlers/external"
import provideRequestScoped from "./provideRequestScoped"

const executeReceived = (unknownEvent: unknown) =>
  T.asUnit(
    Do(T.effect)
      .do(T.sync(() => FW.utils.logger.log("Received integration event", unknownEvent)))
      .bind("event", parseEvent(unknownEvent))
      .doL(({ event }) => provideRequestScoped(handlers(event)))
      .done(),
  )

export default executeReceived
