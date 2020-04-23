import { T } from "@e/framework"
import * as FW from "@fp-app/framework"
import { handlers, parseEvent } from "./eventhandlers/external"
import provideRequestScoped from "./provideRequestScoped"

const executeReceived = (unknownEvent: unknown) =>
  T.asUnit(
    T.Do()
      .do(T.sync(() => FW.utils.logger.log("Received integration event", unknownEvent)))
      .bind("event", parseEvent(unknownEvent))
      .doL(({ event }) => provideRequestScoped(handlers(event)))
      .done(),
  )

export default executeReceived
