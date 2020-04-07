import { HALConfig, requestType, RouteBuilder, utils } from "@fp-app/framework"
import Koa from "koa"
import KoaRouter from "koa-router"
import generateKoaHandler from "./generateKoaHandler"
import { authMiddleware } from "./middleware"

export default class KoaRouteBuilder extends RouteBuilder<Koa.Context, KoaRouter> {
  build(request: requestType) {
    const router = new KoaRouter()
    if (this.basicAuthEnabled) {
      if (!this.userPass) {
        throw new Error("cannot enable auth without loginPass")
      }
      const createMiddleware = authMiddleware(this.userPass)
      router.use(createMiddleware())
    }

    this.setup.forEach(
      ({
        errorHandler,
        method,
        path,
        requestHandler,
        responseTransform,
        validator,
      }) => {
        router.register(
          path,
          [method],
          generateKoaHandler(
            request,
            requestHandler,
            validator,
            errorHandler,
            responseTransform,
          ),
        )
      },
    )

    return router
  }
}

export function createRouterFromMap(
  routerMap: Map<string, RouteBuilder<Koa.Context, KoaRouter>>,
  request: requestType,
) {
  return [...routerMap.entries()].reduce((prev, cur) => {
    const koaRouter = cur[1].build(request)
    return prev.use(cur[0], koaRouter.allowedMethods(), koaRouter.routes())
  }, new KoaRouter())
}

export const extendWithHalLinks = (config: HALConfig) => <
  TOutput extends Record<string, string>
>(
  output: TOutput,
  ctx: Koa.Context,
) => ({
  ...output,
  _links: generateHalLinks(ctx, config, output),
})

// TODO: Perhaps a transformer would be more flexible.
export const generateHalLinks = (
  ctx: Koa.Context,
  halConfig: HALConfig,
  data: Record<string, string>,
) => {
  const halLinks = utils.typedKeysOf(halConfig).reduce((prev, cur) => {
    let href = halConfig[cur]
    if (href.startsWith(".")) {
      href = href.replace(".", ctx.URL.pathname)
    }
    Object.keys(data).forEach((x) => (href = href.replace(`:${x}`, data[x])))
    prev[cur] = { href }
    return prev
  }, {} as Record<string, { href: string }>)
  return halLinks
}
