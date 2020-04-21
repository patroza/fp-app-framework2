import Koa from "koa"

import {
  CombinedValidationError,
  ConnectionException,
  CouldNotAquireDbLockException,
  DbError,
  ErrorBase,
  FieldValidationError,
  ForbiddenError,
  InvalidStateError,
  OptimisticLockException,
  RecordNotFound,
  ValidationError,
  utils,
} from "@fp-app/framework"
import {
  defaultErrorPassthrough,
  ErrorHandlerType,
  NamedHandlerWithDependencies,
  requestType,
} from "@fp-app/framework-classic"
import { Result, pipe, TE } from "@fp-app/fp-ts-extensions"

export default function generateKoaHandler<
  TDeps,
  I,
  T,
  E extends ErrorBase,
  E2 extends ValidationError
>(
  request: requestType,
  handler: NamedHandlerWithDependencies<TDeps, I, T, E>,
  validate: (i: I) => Result<I, E2>,
  handleErrorOrPassthrough: ErrorHandlerType<
    Koa.Context,
    DbError | E | E2
  > = defaultErrorPassthrough,
  responseTransform?: <TOutput>(input: T, ctx: Koa.Context) => TOutput,
) {
  // DbError, because request handler is enhanced with it (decorator)
  // E2 because the validator enhances it.
  const generateTask = (ctx: Koa.Context) => {
    const input: I = { ...ctx.request.body, ...ctx.request.query, ...ctx.params }
    const handleRequest = (i: I) => request(handler, i)
    const shouldHandleError = handleErrorOrPassthrough(ctx)
    const handleError = handleDefaultError(ctx)

    return pipe(
      pipe(validate(input), TE.fromEither),
      TE.chain(handleRequest),
      TE.bimap(
        (err) => (shouldHandleError(err) ? handleError(err) : undefined),
        (result) => {
          if (responseTransform) {
            ctx.body = responseTransform(result, ctx)
          } else {
            ctx.body = result
          }
          if (ctx.method === "POST" && result) {
            ctx.status = 201
          }
        },
      ),
    )
  }
  return async (ctx: Koa.Context) => {
    try {
      const task = generateTask(ctx)
      await task()
    } catch (err) {
      utils.logger.error(err)

      if (err instanceof OptimisticLockException) {
        ctx.status = 409
      } else if (err instanceof CouldNotAquireDbLockException) {
        ctx.status = 503
      } else if (err instanceof ConnectionException) {
        ctx.status = 504
      } else {
        ctx.status = 500
      }
    }
  }
}

const handleDefaultError = (ctx: Koa.Context) => (err: ErrorBase) => {
  const { message } = err

  // TODO: Exhaustive condition error so that we remain aware of possible errors
  // but needs to be then Typed somehow
  // const err2 = new ValidationError("some message") as Err
  // switch (err2.name) {
  //   case "FieldValidationError":
  //   case "CombinedValidationError":
  //   case "ValidationError": break
  //   case "ConnectionError": break
  //   case "RecordNotFound": break
  //   // tslint:disable-next-line
  //   default: { const exhaustiveCheck: never = err2; return exhaustiveCheck }
  // }

  if (err instanceof RecordNotFound) {
    ctx.body = { message }
    ctx.status = 404
  } else if (err instanceof CombinedValidationError) {
    const { errors } = err
    ctx.body = {
      fields: combineErrors(errors),
      message,
    }
    ctx.status = 400
  } else if (err instanceof FieldValidationError) {
    ctx.body = {
      fields: {
        [err.fieldName]:
          err.error instanceof CombinedValidationError
            ? combineErrors(err.error.errors)
            : err.message,
      },
      message,
    }
    ctx.status = 400
  } else if (err instanceof ValidationError) {
    ctx.body = { message }
    ctx.status = 400
  } else if (err instanceof InvalidStateError) {
    ctx.body = { message }
    ctx.status = 422
  } else if (err instanceof ForbiddenError) {
    ctx.body = { message }
    ctx.status = 403
  } else {
    // Unknown error
    ctx.status = 500
  }
}

const combineErrors = (ers: unknown[]) =>
  ers.reduce((prev: ErrType, cur) => {
    if (cur instanceof FieldValidationError) {
      if (cur.error instanceof CombinedValidationError) {
        prev[cur.fieldName] = combineErrors(cur.error.errors)
      } else {
        prev[cur.fieldName] = cur.message
      }
    }
    return prev
  }, {} as ErrType)

type ErrType = Record<string, Record<string, unknown> | string>
