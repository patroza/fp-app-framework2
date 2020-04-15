import fs from "fs"
import { DbError, ErrorBase } from "@fp-app/framework"
import { ValidatorType, JsonValue } from "../utils/validation"
import { NamedHandlerWithDependencies, requestType } from "./mediator"
import { tuple } from "fp-ts/lib/function"
import { promisify } from "util"

export default abstract class RouteBuilder<TContext, TRouter> {
  private static register = <TContext, TRouter>(
    method: METHODS,
    obj: RouteBuilder<TContext, TRouter>,
  ) => <TDependencies, TInput, TOutput, TError, TValidationError>(
    path: string,
    requestHandler: NamedHandlerWithDependencies<
      TDependencies,
      TInput,
      TOutput,
      TError
    >,
    configuration: {
      errorHandler?: ErrorHandlerType<TContext, DbError | TError | TValidationError>
      responseTransform?: ResponseTransform<TContext, TOutput>
      validator: ValidatorType<TInput, TValidationError, JsonValue>
    },
  ) => {
    obj.setup.push({ method, path, requestHandler, ...configuration })
    return obj
  }

  readonly post = RouteBuilder.register<TContext, TRouter>("POST", this)
  readonly get = RouteBuilder.register<TContext, TRouter>("GET", this)
  readonly delete = RouteBuilder.register<TContext, TRouter>("DELETE", this)
  readonly patch = RouteBuilder.register<TContext, TRouter>("PATCH", this)

  protected userPass?: string
  protected setup: RegisteredRoute<TContext>[] = []
  protected basicAuthEnabled = false

  abstract build(request: requestType): TRouter

  getJsonSchema() {
    return this.setup.map(({ method, path, validator }) =>
      tuple(method, path, validator.jsonSchema),
    )
  }

  enableBasicAuth(userPass: string) {
    this.basicAuthEnabled = true
    this.userPass = userPass
    return this
  }
}

export type HALConfig = Record<string, string>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResponseTransform<TContext, TOutput = any> = (
  output: TOutput,
  ctx: TContext,
) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
any

export function writeRouterSchema<TContext, TRouter>(
  routerMap: Map<string, RouteBuilder<TContext, TRouter>>,
) {
  const schema = [...routerMap.entries()].reduce((prev, [path, r]) => {
    prev[path] = r.getJsonSchema().map(([method, p, s2]) => ({
      method,
      subPath: p,
      fullPath: `${path}${p}`,
      schema: s2,
    }))
    return prev
  }, {} as Record<string, MethodSchema[]>)
  return writeFile("./router-schema.json", JSON.stringify(schema, undefined, 2))
}

const writeFile = promisify(fs.writeFile)

type MethodSchema = {
  method: METHODS
  subPath: string
  fullPath: string
  schema: string
}

export type ErrorHandlerType<TContext, TError> = <TErr extends ErrorBase>(
  ctx: TContext,
) => (err: TError) => TErr | TError | void

export const defaultErrorPassthrough = <TErr>() => (err: TErr) => err

interface RegisteredRoute<TContext> {
  method: METHODS
  path: string
  requestHandler: NamedHandlerWithDependencies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validator: ValidatorType<any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorHandler?: ErrorHandlerType<TContext, DbError | any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseTransform?: ResponseTransform<TContext, any>
}

type METHODS = "POST" | "GET" | "DELETE" | "PATCH"
