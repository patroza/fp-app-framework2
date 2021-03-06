import { effect as T } from "@matechs/effect"
import * as KOA from "@matechs/koa"
// import { Do } from "fp-ts-contrib/lib/Do"
import trainTripR from "@e/TrainTrip/router"
import { utils } from "@fp-app/framework"
import * as diskdb from "@fp-app/io.diskdb"

const getHelloWorldRoute = KOA.route(
  "get",
  "/",
  T.pure(
    KOA.routeResponse(200)({
      message: "OK",
    }),
  ),
)

const mainR = T.sequenceT(getHelloWorldRoute)

interface RequestInfo {
  id: string
  method: string
  path: string
  startedAt: Date
  finishedAt?: Date
}
const requestInfoMW = KOA.middleware((ctx, next) => {
  const requestContext: RequestInfo = {
    id: ctx.get("X-Request-Id") || utils.generateShortUuid(),
    method: ctx.method,
    path: ctx.originalUrl,
    startedAt: getCurrentDate(),
  }
  ctx.set("X-Request-Id", requestContext.id)
  ctx.set("X-Request-StartedAt", requestContext.startedAt.toISOString())
  console.log("starting request", JSON.stringify(requestContext, undefined, 2))
  return next().then(() => {
    requestContext.finishedAt = getCurrentDate()
    ctx.set("X-Request-FinishedAt", requestContext.finishedAt.toISOString())
    console.log(
      "finishing request",
      JSON.stringify({ requestContext, status: ctx.status }, undefined, 2),
    )
  })
})

const middlewares = T.sequenceT(requestInfoMW)

const program = T.sequenceT(mainR, trainTripR, middlewares)

export const initialize = async () => {
  if (!(await diskdb.utils.exists("./data"))) {
    await diskdb.utils.mkdir("./data")
  }
}

export default program

function getCurrentDate() {
  return new Date()
}
