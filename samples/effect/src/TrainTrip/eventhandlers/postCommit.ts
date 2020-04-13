// import {
//     TrainTripCreated,
//     TrainTripId,
//     TrainTripStateChanged,
//     UserInputReceived,
//   } from "@/TrainTrip/TrainTrip"
//   import { defaultDependencies, TrainTripPublisherKey } from "@/TrainTrip/usecases/types"
//   import { getTrip } from "@/TrainTrip/infrastructure/api"
//   import { trainTrips } from "@/TrainTrip/infrastructure/TrainTripContext.disk"
//   import {
//     createDomainEventHandlerWithDeps,
//     createIntegrationEventHandlerWithDeps,
//     curryRequest,
//     DbError,
//     requestKey,
//     ApiError,
//     InvalidStateError,
//   } from "@fp-app/framework"
//   import { pipe, TE, Do, toVoid } from "@fp-app/fp-ts-extensions"
//   import lockTrainTrip from "../usecases/lockTrainTrip"
//   import { CustomerRequestedChanges } from "./integration.events"
//   import { wrap } from "../infrastructure/utils"
//   import { compose, map, chain } from "@fp-app/fp-ts-extensions/src/TaskEither"

//   // Domain Events should primarily be used to be turned into Integration Event (Post-Commit, call other service)
//   // There may be other small reasons to use it, like to talk to an external system Pre-Commit.
//   // Otherwise they just add additional layers of indirection and take behavior away often more suited for the Aggregrates/root.
//   // Informing other bounded contexts, generally should not occur within the same transaction, and should thus be handled
//   // by turning into Integration Events.

//   // Ideas: Store Integration Events into the database within the same Commit, and process them in an outside service.
//   // So that we may ensure the events will be processed.
//   // Other options can be to have a compensating action running regularly that checks and fixes things. A sort of eventual consistency.

//   const createIntegrationEventHandler = createIntegrationEventHandlerWithDeps(() => ({
//     trainTripPublisher: TrainTripPublisherKey,
//     ...defaultDependencies,
//   }))

//   createIntegrationEventHandler<TrainTripCreated, void, never>(
//     /* on */ TrainTripCreated,
//     "ScheduleCloudSync",
//     ({ trainTripPublisher }) =>
//       compose(
//         map((x) => x.trainTripId),
//         chain(TE.tryExecuteFW(trainTripPublisher.register)),
//       ),
//   )

//   createIntegrationEventHandler<TrainTripStateChanged, void, never>(
//     /* on */ TrainTripStateChanged,
//     "EitherDebounceOrScheduleCloudSync",
//     ({ trainTripPublisher }) =>
//       compose(
//         map((x) => x.trainTripId),
//         chain(TE.tryExecuteFW(trainTripPublisher.register)),
//       ),
//   )

//   createIntegrationEventHandler<UserInputReceived, void, never>(
//     /* on */ UserInputReceived,
//     "DebouncePendingCloudSync",
//     ({ trainTripPublisher }) =>
//       compose(
//         map((x) => x.trainTripId),
//         chain(TE.tryExecuteFW(trainTripPublisher.registerIfPending)),
//       ),
//   )

//   const createIntegrationCommandEventHandler = createIntegrationEventHandlerWithDeps(
//     () => ({
//       request: requestKey,
//       ...defaultDependencies,
//     }),
//   )

//   createIntegrationCommandEventHandler<CustomerRequestedChanges, void, DbError>(
//     /* on */ CustomerRequestedChanges,
//     "LockTrainTrip",
//     curryRequest(lockTrainTrip),
//   )

//   export interface TrainTripPublisher {
//     registerIfPending: (trainTripId: TrainTripId) => Promise<void>
//     register: (trainTripId: TrainTripId) => Promise<void>
//   }
