import { effect as T } from "@matechs/effect"
import * as KOA from "@matechs/koa"
import * as O from "fp-ts/lib/Option"
// import { Do } from "fp-ts-contrib/lib/Do"
import { sequenceT } from "fp-ts/lib/Apply"
import { pipe } from "fp-ts/lib/pipeable"
import { Do } from "fp-ts-contrib/lib/Do"
import * as GetTrainTrip from "./usecases/GetTrainTrip"
import * as CreateTrainTrip from "./usecases/CreateTrainTrip"
import { DomainEventHandler } from "@fp-app/framework"
import TrainTripReadContext, * as RC from "./infrastructure/TrainTripReadContext.disk"
import DiskDBContext, * as TTC from "./infrastructure/TrainTripContext.disk"
import { TE } from "@fp-app/fp-ts-extensions"
import { joinData, mapErrorToHTTP } from "@/requestHelpers"

// TODO: Without all the hustle..
export const provideRequestScoped = <R, E, A>(
  i: T.Effect<R & RC.HasReadContext & TTC.HasTrainTripContext, E, A>,
): T.Effect<T.Erase<R, RC.HasReadContext & TTC.HasTrainTripContext>, E, A> =>
  T.provideR((r: R) => {
    // TODO: Finish the domain event handlers.
    const eventHandler = new DomainEventHandler(
      (evt) => {
        console.log("Would publish domain evt, but not implemented", evt)
        return TE.right(void 0)
      },
      (evt) => {
        console.log("Would retrieve integration evt, but not implemented", evt)
        return O.none
      },
      (eventsMap) => {
        console.log("Would publish integration evt, but not implemented", eventsMap)
      },
    )
    const readContext = new TrainTripReadContext()
    const trainTrips = TTC.trainTrips()
    const ctx = DiskDBContext({
      eventHandler,
      readContext,
      trainTrips,
    })
    return {
      ...r,
      [RC.contextEnv]: {
        ctx: readContext,
      },
      ...RC.env,
      [TTC.contextEnv]: {
        ctx,
      },
      ...TTC.env,
      // TODO: Mess; reason being that the implementation has an accessor of other R's, but the requestors will receive it preconfigured :S
    } as R & RC.HasReadContext & TTC.HasTrainTripContext
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
    mapErrorToHTTP,
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
    mapErrorToHTTP,
    provideRequestScoped,
  ),
)

const routes = sequenceT(T.effect)(createTrainTrip, getTrainTrip)

const router = pipe(routes, KOA.withSubRouter("/train-trip"))

export default router
