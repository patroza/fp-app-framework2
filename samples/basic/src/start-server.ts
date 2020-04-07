import * as FW from "@fp-app/framework"
import * as KH from "@fp-app/hosting.koa"
import Koa from "koa"
import bodyParser from "koa-bodyparser"
import * as config from "./config"
import createRoot from "./root"
import createRootRouter from "./root.router"

const startServer = async () => {
  const {
    addToLoggingContext,
    bindLogger,
    initialize,
    request,
    setupRequestContext,
  } = createRoot()

  await initialize()

  const [rootMap, rootRouter] = createRootRouter(request)

  FW.utils.setLogger({
    addToLoggingContext,
    // tslint:disable-next-line:no-console
    debug: bindLogger(console.debug),
    // tslint:disable-next-line:no-console
    error: bindLogger(console.error),
    // tslint:disable-next-line:no-console
    log: bindLogger(console.log),
    // tslint:disable-next-line:no-console
    warn: bindLogger(console.warn),
  })

  const app = new Koa()
    .use(KH.saveStartTime)
    .use(KH.setupNamespace({ setupRequestContext }))
    .use(KH.logRequestTime)
    .use(bodyParser())
    .use(KH.handleAuthenticationFailedMiddleware)
    .use(rootRouter.allowedMethods())
    .use(rootRouter.routes())

  await FW.writeRouterSchema(rootMap)

  return app.listen(config.PORT, () => FW.utils.logger.log("server listening on 3535"))
}

startServer().catch(FW.utils.logger.error)
