import { AsyncResult, TE, pipe } from "@fp-app/fp-ts-extensions"
import { benchLog, logger, using } from "../../utils"
import { DbError } from "../errors"
import { configureDependencies, NamedRequestHandler, UOWKey } from "../mediator"
import { requestTypeSymbol } from "../SimpleContainer"

const loggingDecorator = (): RequestDecorator => request => (key, input) => {
  const prefix = `${key.name} ${key[requestTypeSymbol]}`
  return () =>
    benchLog(
      () =>
        using(logger.addToLoggingContext({ request: prefix }), async () => {
          logger.log(`${prefix} input`, input)
          const r = request(key, input)
          const result = await r()
          logger.log(`${prefix} result`, result)
          return result
        }),
      prefix,
    )
}

const uowDecorator = configureDependencies(
  () => ({ unitOfWork: UOWKey }),
  "uowDecorator",
  ({ unitOfWork }) => <TInput, TOutput, TError>(
    request: TRequest<TInput, TOutput, TError>,
  ): TDecoratedRequest<TInput, TOutput, TError, TError | DbError | Error> => (
    key,
    input,
  ) => {
    if (
      key[requestTypeSymbol] !== "COMMAND" &&
      key[requestTypeSymbol] !== "INTEGRATIONEVENT"
    ) {
      return request(key, input)
    }
    return pipe(
      request(key, input),
      TE.chainTee(pipe(TE.tryExecuteFW(unitOfWork.save))),
    )
  },
)

export { loggingDecorator, uowDecorator }

type RequestDecorator = <TInput, TOutput, TError>(
  request: TRequest<TInput, TOutput, TError>,
) => TRequest<TInput, TOutput, TError>

type TRequest<TInput, TOutput, TError> = (
  key: NamedRequestHandler<TInput, TOutput, TError>,
  input: TInput,
) => AsyncResult<TOutput, TError>

type TDecoratedRequest<TInput, TOutput, TError extends TErrorOut, TErrorOut> = (
  key: NamedRequestHandler<TInput, TOutput, TError>,
  input: TInput,
) => AsyncResult<TOutput, TErrorOut>
