import Koa from "koa"
import * as KOA from "@matechs/koa"
import {
  ValidationError,
  RecordNotFound,
  CombinedValidationError,
  FieldValidationError,
  InvalidStateError,
  ForbiddenError,
  ErrorBase,
  OptimisticLockException,
  CouldNotAquireDbLockException,
  ConnectionException,
} from "@fp-app/framework"
import { T, pipe } from "@fp-app/fp-ts-extensions"

export const handleErrors = <S, R, E extends ErrorBase, A>(eff: T.Effect<S, R, E, A>) =>
  pipe(eff, mapErrorToHTTP, captureError)

export const captureError = <S, R, A>(
  inp: T.Effect<S, R, KOA.RouteError<{ message: string }>, A>,
): T.Effect<S, R, KOA.RouteError<{ message: string }>, A> =>
  pipe(
    inp,
    T.foldExit((cause) => {
      if (cause._tag === "Abort") {
        if (cause.abortedWith instanceof OptimisticLockException) {
          return T.raiseError(KOA.routeError(409, { message: "Aborted" }))
        } else if (cause.abortedWith instanceof CouldNotAquireDbLockException) {
          return T.raiseError(KOA.routeError(503, { message: "Aborted" }))
        } else if (cause.abortedWith instanceof ConnectionException) {
          return T.raiseError(KOA.routeError(504, { message: "Aborted" }))
        } else {
          console.error("Unknown error ocurred", cause.abortedWith)
          return T.raiseAbort(cause.abortedWith)
        }
      }
      if (cause._tag === "Interrupt") {
        return T.raiseInterrupt
      }
      return T.raiseError(cause.error)
    }, T.pure),
  )

export const mapErrorToHTTP = T.mapError((err: ErrorBase) => {
  const { message } = err

  if (err instanceof RecordNotFound) {
    return KOA.routeError(404, { message })
  } else if (err instanceof CombinedValidationError) {
    const { errors } = err
    return KOA.routeError(400, {
      fields: combineErrors(errors),
      message,
    })
  } else if (err instanceof FieldValidationError) {
    return KOA.routeError(400, {
      fields: {
        [err.fieldName]:
          err.error instanceof CombinedValidationError
            ? combineErrors(err.error.errors)
            : err.message,
      },
      message,
    })
  } else if (err instanceof ValidationError) {
    return KOA.routeError(400, { message })
  } else if (err instanceof InvalidStateError) {
    return KOA.routeError(422, { message })
  } else if (err instanceof ForbiddenError) {
    return KOA.routeError(403, { message })
  } else {
    // Unknown error
    return KOA.routeError(500, { message: "Unexpected error occurred" })
  }
})

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

export const joinData = (ctx: Koa.ParameterizedContext) => ({
  ...ctx.request.body,
  ...ctx.query,
  ...ctx.params,
})
