import { effect as T } from "@matechs/effect"
import * as KOA from "@matechs/koa"
import * as O from "fp-ts/lib/Option"
// import { Do } from "fp-ts-contrib/lib/Do"
import { sequenceT } from "fp-ts/lib/Apply"
import { pipe } from "fp-ts/lib/pipeable"
import { Do } from "fp-ts-contrib/lib/Do"
import * as GetTrainTrip from "./usecases/GetTrainTrip"
import * as CreateTrainTrip from "./usecases/CreateTrainTrip"
import * as ChangeTrainTrip from "./usecases/ChangeTrainTrip"
import * as DeleteTrainTrip from "./usecases/DeleteTrainTrip"
import TrainTripReadContext, * as RC from "./infrastructure/TrainTripReadContext.disk"
import DiskDBContext, * as TTC from "./infrastructure/TrainTripContext.disk"
import { joinData, handleErrors } from "@/requestHelpers"
import { createLazy } from "@fp-app/framework/src/utils"
import * as API from "./infrastructure/api"
import * as TTP from "./infrastructure/trainTripPublisher.inMemory"

// TODO: Without all the hustle..
export const provideRequestScoped = <R, E, A>(
  i: T.Effect<R & RC.ReadContext & TTC.TrainTripContext, E, A>,
): T.Effect<
  T.Erase<R, RC.ReadContext & TTC.TrainTripContext> &
    API.TripApi &
    TTP.TrainTripPublisher,
  E,
  A
> =>
  T.provideR((r: R & TTP.TrainTripPublisher & API.TripApi) => {
    const readContext = createLazy(() => new TrainTripReadContext())
    const ctx = createLazy(() => {
      //   // TODO: Finish the domain event handlers.
      //   const eventHandler = new DomainEventHandler(
      //     (evt) =>
      //       TE.tryCatch(
      //         () => T.runToPromise(T.provideAll(env)(PreCommit.handlers(evt as any))),
      //         (err) => err as Error,
      //       ),
      //     (evt) =>
      //       TE.tryCatch(
      //         () => T.runToPromise(T.provideAll(env)(PostCommit.handlers(evt as any))),
      //         (err) => err as Error,
      //       ),
      //   )
      const trainTrips = TTC.trainTrips()
      return DiskDBContext({
        // // TODO
        // // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eventHandler: eventHandler as any,
        readContext: readContext.value,
        trainTrips,
      })
    })

    const env = {
      ...r,
      [RC.contextEnv]: {
        get ctx() {
          return readContext.value
        },
      },
      ...RC.env,
      [TTC.contextEnv]: {
        get ctx() {
          return ctx.value
        },
      },
      ...TTC.env,
      // TODO: Mess; reason being that the implementation has an accessor of other R's, but the requestors will receive it preconfigured :S
    } as R &
      TTP.TrainTripPublisher &
      API.TripApi &
      RC.ReadContext &
      TTC.TrainTripContext
    return env
  })(i)

const getTrainTrip = KOA.route(
  "get",
  "/:trainTripId",
  pipe(
    Do(T.effect)
      .bindL("input", () =>
        KOA.accessReqM((ctx) =>
          pipe(GetTrainTrip.validatePrimitives(joinData(ctx)), T.fromEither),
        ),
      )
      .bindL("result", ({ input }) => GetTrainTrip.default(input))
      .return(({ result }) =>
        O.isSome(result)
          ? KOA.routeResponse(200, result.value)
          : KOA.routeResponse(404, null),
      ),
    handleErrors,
    provideRequestScoped,
  ),
)

const createTrainTrip = KOA.route(
  "post",
  "/",
  pipe(
    Do(T.effect)
      .bind(
        "input",
        KOA.accessReqM((ctx) =>
          pipe(CreateTrainTrip.validatePrimitives(joinData(ctx)), T.fromEither),
        ),
      )
      .bindL("result", ({ input }) => CreateTrainTrip.default(input))
      .return(({ result }) => KOA.routeResponse(200, result)),
    handleErrors,
    provideRequestScoped,
  ),
)

const changeTrainTrip = KOA.route(
  "patch",
  "/:trainTripId",
  pipe(
    Do(T.effect)
      .bind(
        "input",
        KOA.accessReqM((ctx) =>
          pipe(ChangeTrainTrip.validatePrimitives(joinData(ctx)), T.fromEither),
        ),
      )
      .bindL("result", ({ input }) => ChangeTrainTrip.default(input))
      .return(({ result }) => KOA.routeResponse(200, result)),
    handleErrors,
    provideRequestScoped,
  ),
)

const deleteTrainTrip = KOA.route(
  "delete",
  "/:trainTripId",
  pipe(
    Do(T.effect)
      .bindL("input", () =>
        KOA.accessReqM((ctx) =>
          pipe(DeleteTrainTrip.validatePrimitives(joinData(ctx)), T.fromEither),
        ),
      )
      .bindL("result", ({ input }) => DeleteTrainTrip.default(input))
      .return(({ result }) => KOA.routeResponse(200, result)),
    handleErrors,
    provideRequestScoped,
  ),
)

const routes = sequenceT(T.effect)(
  createTrainTrip,
  getTrainTrip,
  changeTrainTrip,
  deleteTrainTrip,
)

const router = pipe(routes, KOA.withSubRouter("/train-trip"))

export default router
