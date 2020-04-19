import { effect as T } from "@matechs/effect"
import { Do } from "fp-ts-contrib/lib/Do"
import * as CreateTrainTrip from "../usecases/CreateTrainTrip"
import * as DeleteTrainTrip from "../usecases/DeleteTrainTrip"
import * as GetTrainTrip from "../usecases/GetTrainTrip"
import * as ChangeTrainTrip from "../usecases/ChangeTrainTrip"
import { O, pipe } from "@fp-app/fp-ts-extensions"
import provideRequestScoped from "../provideRequestScoped"

export const checkError = <S, R, E, A>(e: T.Effect<S, R, E, A>) =>
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
  pipe(
    Do(T.effect)
      .bind("input", T.fromEither(CreateTrainTrip.validatePrimitives(inp)))
      .bindL("trainTripId", ({ input }) => CreateTrainTrip.default(input))
      .return((r) => r.trainTripId),
    provideRequestScoped(),
  )

export const createDefaultTrip = createTrainTrip({
  templateId: "template-id1",
  startDate: "2020-12-01",
  pax: { adults: 0, children: 6, babies: 0, infants: 0, teenagers: 0 },
})

export const changeTrainTrip = (inp: unknown) =>
  pipe(
    T.asUnit(
      Do(T.effect)
        .bind("input", T.fromEither(ChangeTrainTrip.validatePrimitives(inp)))
        .doL(({ input }) => ChangeTrainTrip.default(input))
        .done(),
    ),
    provideRequestScoped(),
  )

export const deleteTrainTrip = (trainTripId: string) =>
  pipe(
    Do(T.effect)
      .bind("input", T.fromEither(DeleteTrainTrip.validatePrimitives({ trainTripId })))
      .bindL("result", ({ input }) => DeleteTrainTrip.default(input))
      .return((r) => r.result),
    provideRequestScoped(),
  )

export const getTrainTripO = (trainTripId: string) =>
  pipe(
    Do(T.effect)
      .bind("input", T.fromEither(GetTrainTrip.validatePrimitives({ trainTripId })))
      .bindL("result", ({ input }) => GetTrainTrip.default(input))
      .return((r) => r.result),
    provideRequestScoped(),
  )

export const getTrainTrip = (trainTripId: string) =>
  T.effect.chain(getTrainTripO(trainTripId), (o) =>
    O.isSome(o) ? T.pure(o.value) : T.raiseAbort(new Error("must exist")),
  )
