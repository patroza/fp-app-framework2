import { effect as T } from "@matechs/effect"
import Koa from "koa"
import * as KOA from "@matechs/koa"
import { ValidationError } from "@fp-app/framework"

export const mapErrorToHTTP = T.mapError((err) => {
  if (err instanceof ValidationError) {
    return KOA.routeError(400, err)
  }
  return KOA.routeError(500, err)
})

export const joinData = (ctx: Koa.ParameterizedContext) => ({
  ...ctx.request.body,
  ...ctx.query,
  ...ctx.params,
})
