import TrainTrip, { Events, TrainTripStateChanged } from "@e/TrainTrip/TrainTrip"
import { Do, pipe } from "@fp-app/fp-ts-extensions"
import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"
import * as API from "@e/TrainTrip/infrastructure/api"
import { T } from "@e/meffect"

const OnTrainTripStateChanged = (event: TrainTripStateChanged) =>
  Do(T.effect)
    .bind("trainTrip", TC.loadE(event.trainTripId))
    .bindL("trip", ({ trainTrip }) =>
      API.get(trainTrip.currentTravelClassConfiguration.travelClass.templateId),
    )
    .bindL("result", ({ trainTrip, trip }) =>
      T.sync(() => pipe(trainTrip, TrainTrip.updateTrip(trip))),
    )
    .doL(({ result: [tt] }) => TC.registerChanged(tt))
    .return(({ result: [, events] }) => events)

const notImplemented = (evt: Events) =>
  T.sync(() => {
    console.log(`${evt.type} domain event not implemented`)
    return []
  })

const eventHandlers = {
  //TrainTripStateChanged: OnTrainTripStateChanged,
  TrainTripStateChanged: notImplemented,
}

export const handlers = <TEvent extends Events>(evt: TEvent) => {
  const keys = Object.keys(eventHandlers)
  if (keys.includes(evt.type)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const h = eventHandlers[evt.type as keyof typeof eventHandlers](evt as any)
    return T.effect.chain(h, (events) => {
      if (events.length) {
        return T.raiseAbort(new Error("Does not currently support recursive events"))
      }
      return T.unit
    })
  } else {
    return notImplemented(evt)
  }
}
