import {
  TrainTripCreated,
  TrainTripId,
  TrainTripStateChanged,
  UserInputReceived,
} from "@c/TrainTrip/TrainTrip"
import { defaultDependencies, TrainTripPublisherKey } from "@c/TrainTrip/usecases/types"
import { getTrip } from "@c/TrainTrip/infrastructure/api"
import { trainTrips } from "@c/TrainTrip/infrastructure/TrainTripContext.disk"
import { DbError, ApiError, InvalidStateError } from "@fp-app/framework"
import {
  createDomainEventHandlerWithDeps,
  createIntegrationEventHandlerWithDeps,
  curryRequest,
  requestKey,
} from "@fp-app/framework-classic"
import { pipe, TE, toVoid, RTE } from "@fp-app/fp-ts-extensions"
import lockTrainTrip from "../usecases/lockTrainTrip"
import { CustomerRequestedChanges } from "./integration.events"
import { wrap } from "../infrastructure/utils"

// Domain Events should primarily be used to be turned into Integration Event (Post-Commit, call other service)
// There may be other small reasons to use it, like to talk to an external system Pre-Commit.
// Otherwise they just add additional layers of indirection and take behavior away often more suited for the Aggregrates/root.
// Informing other bounded contexts, generally should not occur within the same transaction, and should thus be handled
// by turning into Integration Events.

// Ideas: Store Integration Events into the database within the same Commit, and process them in an outside service.
// So that we may ensure the events will be processed.
// Other options can be to have a compensating action running regularly that checks and fixes things. A sort of eventual consistency.

const createIntegrationEventHandler = createIntegrationEventHandlerWithDeps(() => ({
  trainTripPublisher: TrainTripPublisherKey,
  ...defaultDependencies,
}))

createIntegrationEventHandler<TrainTripCreated, void, never>(
  /* on */ TrainTripCreated,
  "ScheduleCloudSync",
  ({ trainTripPublisher }) => (input) =>
    TE.rightTask(() => trainTripPublisher.register(input.trainTripId)),
)

createIntegrationEventHandler<TrainTripStateChanged, void, never>(
  /* on */ TrainTripStateChanged,
  "EitherDebounceOrScheduleCloudSync",
  ({ trainTripPublisher }) => (input) =>
    TE.rightTask(() => trainTripPublisher.register(input.trainTripId)),
)

createIntegrationEventHandler<UserInputReceived, void, never>(
  /* on */ UserInputReceived,
  "DebouncePendingCloudSync",
  ({ trainTripPublisher }) => (input) =>
    TE.rightTask(() => trainTripPublisher.registerIfPending(input.trainTripId)),
)

const createIntegrationCommandEventHandler = createIntegrationEventHandlerWithDeps(
  () => ({
    request: requestKey,
    ...defaultDependencies,
  }),
)

createIntegrationCommandEventHandler<CustomerRequestedChanges, void, DbError>(
  /* on */ CustomerRequestedChanges,
  "LockTrainTrip",
  curryRequest(lockTrainTrip),
)

const createDomainEventHandler = createDomainEventHandlerWithDeps(() => ({
  trainTrips,
  getTrip,
}))

createDomainEventHandler<TrainTripStateChanged, void, RefreshTripInfoError>(
  /* on */ TrainTripStateChanged,
  "RefreshTripInfo",
  ({ getTrip, trainTrips }) => (event) =>
    TE.Do()
      .bind(
        "trainTrip",
        pipe(
          event.trainTripId,
          pipe(wrap(trainTrips.load), RTE.liftErr<RefreshTripInfoError>()),
        ),
      )
      .bindL("trip", ({ trainTrip }) =>
        pipe(
          trainTrip.currentTravelClassConfiguration.travelClass.templateId,
          pipe(getTrip),
        ),
      )
      .doL(({ trainTrip, trip }) => pipe(trainTrip.updateTrip(trip), TE.right))
      .return(toVoid),
)

export interface TrainTripPublisher {
  registerIfPending: (trainTripId: TrainTripId) => Promise<void>
  register: (trainTripId: TrainTripId) => Promise<void>
}

type RefreshTripInfoError = DbError | ApiError | InvalidStateError
