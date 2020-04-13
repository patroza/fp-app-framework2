import TrainTrip, {
  TrainTripStateChanged,
  UserInputReceived,
  TrainTripDeleted,
  TrainTripCreated,
} from "@/TrainTrip/TrainTrip"
import { RecordNotFound } from "@fp-app/framework"
import { pipe, Do, toVoid, O } from "@fp-app/fp-ts-extensions"
import * as TC from "@/TrainTrip/infrastructure/TrainTripContext.disk"
import * as API from "@/TrainTrip/infrastructure/api"
import { T } from "@/meffect"

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
    .bind(
      "trainTrip",
      pipe(
        TC.load(event.trainTripId),
        // "wrap"
        T.chain(
          O.fold(
            () => T.raiseError(new RecordNotFound("trainTrip", event.trainTripId)),
            (x) => T.pure(x) as T.Effect<unknown, RecordNotFound, TrainTrip>,
          ),
        ),
      ),
    )
    .bindL("trip", ({ trainTrip }) =>
      API.get(trainTrip.currentTravelClassConfiguration.travelClass.templateId),
    )
    .doL(({ trainTrip, trip }) => T.sync(() => trainTrip.updateTrip(trip)))
    .return(toVoid)

const notImplemented = (evt: Events) =>
  T.sync(() => console.log(`${evt.type} domain event not implemented`))

const eventHandlers = {
  TrainTripStateChanged: OnTrainTripStateChanged,
}
type Events =
  | TrainTripCreated
  | TrainTripStateChanged
  | TrainTripDeleted
  | UserInputReceived

export const handlers = (evt: Events) => {
  const keys = Object.keys(eventHandlers)
  if (keys.includes(evt.type)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return eventHandlers[evt.type as keyof typeof eventHandlers](evt as any)
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
