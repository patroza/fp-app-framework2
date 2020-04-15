import TrainTrip, { Events, TrainTripStateChanged } from "@e/TrainTrip/TrainTrip"
import { Do } from "@fp-app/fp-ts-extensions"
import * as TC from "@e/TrainTrip/infrastructure/TrainTripContext.disk"
import * as API from "@e/TrainTrip/infrastructure/api"
import { T } from "@e/meffect"

// import { U } from "ts-toolbelt"

// const readInAggregateTodosOnlyTodoRemoved = todosAggregate.readOnly(
//     defaultConfig("read-todo-removed")
//   )(["TodoRemoved"])(match =>
//     match({
//       TodoRemoved: todoRemoved => logger.info(JSON.stringify(todoRemoved))
//     })
//   );

// const handleEvents = <R, E, A>(
//   match: (handlers: {
//     OnTrainTripStateChanged: <R, E, A>(
//       event: TrainTripStateChanged,
//     ) => T.Effect<R, E, A>
//   }) => T.Effect<R, E, A>,
// ) =>
//   match({
//     OnTrainTripStateChanged,
//   })

const OnTrainTripStateChanged = (event: TrainTripStateChanged) =>
  Do(T.effect)
    .bind("trainTrip", TC.loadE(event.trainTripId))
    .bindL("trip", ({ trainTrip }) =>
      API.get(trainTrip.currentTravelClassConfiguration.travelClass.templateId),
    )
    .bindL("result", ({ trainTrip, trip }) =>
      T.sync(() => TrainTrip.updateTrip(trainTrip)(trip)),
    )
    .doL(({ result: [tt] }) => TC.registerChanged(tt))
    .return(({ result: [, events] }) => events)

const notImplemented = (evt: Events) =>
  T.sync(() => {
    console.log(`${evt.type} domain event not implemented`)
    return []
  })

const eventHandlers = {
  TrainTripStateChanged: OnTrainTripStateChanged,
}

export const handlers = (evt: Events) => {
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

// createDomainEventHandler<TrainTripStateChanged, void, RefreshTripInfoError>(
//     /* on */ TrainTripStateChanged,
//     "RefreshTripInfo",
//     ({ _, getTrip, trainTrips }) => (event) =>
//       Do(TE.taskEither)
//         .bind(
//           "trainTrip",
//           pipe(event.trainTripId, pipe(wrap(trainTrips.load), _.RTE.liftErr)),
//         )
//         .bindL("trip", ({ trainTrip }) =>
//           pipe(
//             trainTrip.currentTravelClassConfiguration.travelClass.templateId,
//             pipe(getTrip, _.RTE.liftErr),
//           ),
//         )
//         .doL(({ trainTrip, trip }) => pipe(trainTrip.updateTrip(trip), TE.right))
//         .return(toVoid),
//   )

// type RefreshTripInfoError = DbError | ApiError | InvalidStateError
