import TrainTrip, {
  TrainTripCreated,
  TrainTripId,
  TrainTripStateChanged,
  UserInputReceived,
} from "@/TrainTrip/TrainTrip"
import {
  DbContextKey,
  defaultDependencies,
  getTripKey,
  TrainTripPublisherKey,
} from "@/TrainTrip/usecases/types"
import {
  createDomainEventHandlerWithDeps,
  createIntegrationEventHandlerWithDeps,
  curryRequest,
  DbError,
  requestKey,
  ApiError,
  InvalidStateError,
} from "@fp-app/framework"
import { pipe, TE } from "@fp-app/fp-ts-extensions"
import lockTrainTrip from "../usecases/lockTrainTrip"
import { CustomerRequestedChanges } from "./integration.events"

// Domain Events should primarily be used to be turned into Integration Event (Post-Commit, call other service)
// There may be other small reasons to use it, like to talk to an external system Pre-Commit.
// Otherwise they just add additional layers of indirection and take behavior away often more suited for the Aggregrates/root.
// Informing other bounded contexts, generally should not occur within the same transaction, and should thus be handled
// by turning into Integration Events.

// Ideas: Store Integration Events into the database within the same Commit, and process them in an outside service.
// So that we may ensure the events will be processed.
// Other options can be to have a compensating action running regularly that checks and fixes things. A sort of eventual consistency.

const createIntegrationEventHandler = createIntegrationEventHandlerWithDeps({
  trainTripPublisher: TrainTripPublisherKey,
  ...defaultDependencies,
})

createIntegrationEventHandler<TrainTripCreated, void, never>(
  /* on */ TrainTripCreated,
  "ScheduleCloudSync",
  ({ trainTripPublisher }) =>
    TE.compose(
      TE.map(x => x.trainTripId),
      TE.chain(TE.tryExecuteFW(trainTripPublisher.register)),
    ),
)

createIntegrationEventHandler<TrainTripStateChanged, void, never>(
  /* on */ TrainTripStateChanged,
  "EitherDebounceOrScheduleCloudSync",
  ({ trainTripPublisher }) =>
    TE.compose(
      TE.map(x => x.trainTripId),
      TE.chain(TE.tryExecuteFW(trainTripPublisher.register)),
    ),
)

createIntegrationEventHandler<UserInputReceived, void, never>(
  /* on */ UserInputReceived,
  "DebouncePendingCloudSync",
  ({ trainTripPublisher }) =>
    TE.compose(
      TE.map(x => x.trainTripId),
      TE.chain(TE.tryExecuteFW(trainTripPublisher.registerIfPending)),
    ),
)

// const createIntegrationCommandEventHandler = createIntegrationEventHandlerWithDeps({ db: DbContextKey, ...defaultDependencies })
const createIntegrationCommandEventHandler = createIntegrationEventHandlerWithDeps({
  request: requestKey,
  ...defaultDependencies,
})

createIntegrationCommandEventHandler<CustomerRequestedChanges, void, DbError>(
  /* on */ CustomerRequestedChanges,
  "LockTrainTrip",
  curryRequest(lockTrainTrip),
)

const createDomainEventHandler = createDomainEventHandlerWithDeps({
  db: DbContextKey,
  getTrip: getTripKey,
})

createDomainEventHandler<TrainTripStateChanged, void, RefreshTripInfoError>(
  /* on */ TrainTripStateChanged,
  "RefreshTripInfo",
  ({ _, db, getTrip }) =>
    TE.compose(
      TE.map(x => x.trainTripId),
      TE.chain(pipe(db.trainTrips.load, _.RTE.liftErr)),
      TE.chainTup(pipe(getTripFromTrainTrip(getTrip), _.RTE.liftErr)),
      // ALT1
      // pipe(
      //   (trainTrip: TrainTrip) =>
      //     getTrip(trainTrip.currentTravelClassConfiguration.travelClass.templateId),
      //   _.RTE.liftErr,
      // ),
      // ALT2
      // TE.compose(
      //   TE.map(
      //     trainTrip =>
      //       trainTrip.currentTravelClassConfiguration.travelClass.templateId,
      //   ),
      //   TE.chain(pipe(getTrip, _.RTE.liftErr)),
      // ),
      TE.map(([trip, trainTrip]) => trainTrip.updateTrip(trip)),
    ),
)

const getTripFromTrainTrip = (getTrip: typeof getTripKey) => (trainTrip: TrainTrip) =>
  getTrip(trainTrip.currentTravelClassConfiguration.travelClass.templateId)

export interface TrainTripPublisher {
  registerIfPending: (trainTripId: TrainTripId) => Promise<void>
  register: (trainTripId: TrainTripId) => Promise<void>
}

type RefreshTripInfoError = DbError | ApiError | InvalidStateError
