import { RT, O, E, Task, RTE } from "@fp-app/fp-ts-extensions"
import { RecordNotFound } from "@fp-app/framework"
import { pipe } from "fp-ts/lib/pipeable"

export const wrap = <T>(
  f: RT.ReaderTask<string, O.Option<T>>,
): RTE.ReaderTaskEither<string, RecordNotFound, T> => (id: string) =>
  pipe(
    f(id),
    Task.map((x) => {
      if (O.isSome(x)) {
        return E.ok(x.value)
      }
      return E.err(new RecordNotFound("TrainTrip", id))
    }),
  )
