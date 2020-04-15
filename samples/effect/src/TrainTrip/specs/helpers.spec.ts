import { effect as T } from "@matechs/effect"
import { Do } from "fp-ts-contrib/lib/Do"
import * as CreateTrainTrip from "../usecases/CreateTrainTrip"
import * as DeleteTrainTrip from "../usecases/DeleteTrainTrip"
import * as GetTrainTrip from "../usecases/GetTrainTrip"
import * as ChangeTrainTrip from "../usecases/ChangeTrainTrip"
import { O } from "@fp-app/fp-ts-extensions"
import provideRequestScoped from "../provideRequestScoped"

export const checkError = <R, E, A>(e: T.Effect<R, E, A>) =>
  T.effect.foldExit(
    e,
    (err) => {
      switch (err._tag) {
        case "Raise":
          return T.pure(err.error)
        default:
          return T.pure(null)
      }
    },
    T.pure,
  )

export const createTrainTrip = (inp: unknown) =>
  provideRequestScoped(
    Do(T.effect)
      .bind("input", T.fromEither(CreateTrainTrip.validatePrimitives(inp)))
      .bindL("trainTripId", ({ input }) => CreateTrainTrip.default(input))
      .return((r) => r.trainTripId),
  )

export const createDefaultTrip = createTrainTrip({
  templateId: "template-id1",
  startDate: "2020-12-01",
  pax: { adults: 0, children: 6, babies: 0, infants: 0, teenagers: 0 },
})

export const changeTrainTrip = (inp: unknown) =>
  provideRequestScoped(
    T.asUnit(
      Do(T.effect)
        .bind("input", T.fromEither(ChangeTrainTrip.validatePrimitives(inp)))
        .doL(({ input }) => ChangeTrainTrip.default(input))
        .done(),
    ),
  )

export const deleteTrainTrip = (trainTripId: string) =>
  provideRequestScoped(
    Do(T.effect)
      .bind("input", T.fromEither(DeleteTrainTrip.validatePrimitives({ trainTripId })))
      .bindL("result", ({ input }) => DeleteTrainTrip.default(input))
      .return((r) => r.result),
  )

export const getTrainTripO = (trainTripId: string) =>
  provideRequestScoped(
    Do(T.effect)
      .bind("input", T.fromEither(GetTrainTrip.validatePrimitives({ trainTripId })))
      .bindL("result", ({ input }) => GetTrainTrip.default(input))
      .return((r) => r.result),
  )

export const getTrainTrip = (trainTripId: string) =>
  T.effect.chain(getTrainTripO(trainTripId), (o) =>
    O.isSome(o) ? T.pure(o.value) : T.raiseAbort(new Error("must exist")),
  )
