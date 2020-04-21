import { O, E, Task, TE } from "@fp-app/fp-ts-extensions"
import { RecordNotFound } from "@fp-app/framework"
import { pipe } from "fp-ts/lib/pipeable"

export const wrap = <T>(f: (id: string) => Task.Task<O.Option<T>>) => (
  id: string,
): TE.TaskEither<RecordNotFound, T> =>
  pipe(
    f(id),
    Task.map(
      O.fold(
        () => E.err(new RecordNotFound("TrainTrip", id)),
        (x) => E.ok(x),
      ),
    ),
  )
