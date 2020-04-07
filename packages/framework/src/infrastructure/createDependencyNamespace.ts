import chalk from "chalk"
import { createNamespace, getNamespace } from "cls-hooked"
import format from "date-fns/format"
import { EventEmitter } from "events"
import Event from "../event"
import { generateShortUuid, getLogger, removeElement, using } from "../utils"
import { Constructor } from "../types"
import { loggingDecorator, uowDecorator } from "./decorators"
import DomainEventHandler from "./domainEventHandler"
import executePostCommitHandlers from "./executePostCommitHandlers"
import {
  getRegisteredRequestAndEventHandlers,
  publish,
  request,
  RequestContextBase,
  requestInNewScopeKey,
  requestInNewScopeType,
  requestKey,
  requestType,
  resolveEventKey,
  UsecaseWithDependencies,
  NamedHandlerWithDependencies,
} from "./mediator"
import { processReceivedEvent } from "./pubsub"
import SimpleContainer, { DependencyScope, Key } from "./SimpleContainer"
import { O, pipe, RANE } from "@fp-app/fp-ts-extensions"

const logger = getLogger("registry")

export default function createDependencyNamespace(
  namespace: string,
  requestScopeKey: Key<RequestContextBase>,
) {
  const ns = createNamespace(namespace)
  const getDependencyScope = (): DependencyScope =>
    getNamespace(namespace).get(dependencyScopeKey)
  const setDependencyScope = (scope: DependencyScope) =>
    getNamespace(namespace).set(dependencyScopeKey, scope)
  const hasDependencyScope = () => getDependencyScope() != null

  interface LoggingScope {
    items: {}[]
  }

  const container = new SimpleContainer(getDependencyScope, setDependencyScope)

  const getLoggingScope = (): LoggingScope =>
    getNamespace(namespace).get(loggingScopeKey)

  const addToLoggingContext = (item: Record<string, unknown>) => {
    getLoggingScope().items.push(item)
    return {
      dispose: () => removeElement(getLoggingScope().items, item),
    }
  }

  const bindLogger = (fnc: (...args2: unknown[]) => void) => (...args: unknown[]) => {
    const context = hasDependencyScope() && container.get(requestScopeKey)
    const datetime = new Date()
    const timestamp = format(datetime, "yyyy-MM-dd HH:mm:ss")
    const scope = getLoggingScope()
    const items =
      scope &&
      scope.items.reduce(
        (prev, cur) => ({ ...prev, ...cur }),
        {} as Record<string, unknown>,
      )
    const id = context
      ? context.correllationId === context.id
        ? context.id
        : `${context.id} (${context.correllationId})`
      : "root context"
    return fnc(
      `${chalk.green(timestamp)} ${chalk.blue(`[${id}]`)}`,
      ...args.concat(items && Object.keys(items).length ? [items] : []),
    )
  }

  const setupChildContext = <T>(cb: () => Promise<T>) =>
    ns.runPromise(() => {
      const currentContext = container.get(requestScopeKey)
      const { correllationId, id } = currentContext
      return using(container.createScope(), () => {
        const context = container.get(requestScopeKey)
        Object.assign(context, { correllationId: correllationId || id })
        logger.debug(chalk.magenta("Created child context"))
        return cb()
      })
    })

  const setupRequestContext = <T>(
    cb: (
      context: RequestContextBase,
      bindEmitter: typeof ns["bindEmitter"],
    ) => Promise<T>,
  ) =>
    ns.runPromise(() =>
      using(container.createScope(), () => {
        getNamespace(namespace).set(loggingScopeKey, { items: [] })
        logger.debug(chalk.magenta("Created request context"))
        return cb(container.get(requestScopeKey), (emitter: EventEmitter) =>
          ns.bindEmitter(emitter),
        )
      }),
    )
  const getDomainEventHandlers = (evt: Event) =>
    pipe(O.fromNullable(domainHandlerMap.get(evt.constructor)), O.chain(RANE.fromArray))
  const publishDomainEventHandler = publish((evt) =>
    pipe(getDomainEventHandlers(evt), O.map(RANE.map((y) => container.getF(y)))),
  )
  const getIntegrationEventHandlers = (evt: Event) =>
    pipe(
      O.fromNullable(integrationHandlerMap.get(evt.constructor)),
      O.chain(RANE.fromArray),
    )
  const publishIntegrationEventHandler = publish((evt) =>
    pipe(getIntegrationEventHandlers(evt), O.map(RANE.map((y) => container.getF(y)))),
  )
  container.registerScopedF(
    DomainEventHandler,
    () =>
      new DomainEventHandler(
        publishDomainEventHandler,
        getIntegrationEventHandlers,
        container.getF(executePostCommitHandlers),
      ),
  )
  container.registerScopedF(requestScopeKey, () => {
    const id = generateShortUuid()
    return { id, correllationId: id }
  })
  getRegisteredRequestAndEventHandlers().forEach((h) =>
    container.registerScopedConcrete(h),
  )

  container.registerScopedConcrete(uowDecorator)
  container.registerSingletonConcrete(loggingDecorator)
  container.registerDecorator(requestKey, uowDecorator, loggingDecorator)

  container.registerSingletonF(executePostCommitHandlers, executePostCommitHandlers)

  const publishInNewContext = (evt: string, requestId: string) =>
    setupRequestContext((context) => {
      const correllationId = requestId || context.id
      Object.assign(context, { correllationId })

      const process = processReceivedEvent({
        publish: publishIntegrationEventHandler,
        resolveEvent: container.getF(resolveEventKey),
      })
      return process(evt)()
    })

  const requestInNewContext: requestInNewScopeType = (key, evt) => () =>
    setupChildContext(() => container.getF(requestKey)(key, evt)())
  container.registerSingletonF(requestKey, () =>
    request((key) => container.getConcrete(key)),
  )
  container.registerInstanceF(requestInNewScopeKey, requestInNewContext)

  // In a perfect world, the decorators also enhance the type here
  // however they also apply different behavior depending on the request.
  // ie the uowDecorator, if a command, will call save on the uow and thus should
  // extend the error with | DbError...
  const request2: requestType = (key, input) => container.getF(requestKey)(key, input)

  return {
    addToLoggingContext,
    bindLogger,
    container,
    setupRequestContext,

    publishInNewContext,
    request: request2,
  }
}

const dependencyScopeKey = "dependencyScope"
const loggingScopeKey = "loggingScope"

const registerDomainEventHandler = (
  event: Constructor<unknown>,
  handler: UsecaseWithDependencies,
) => {
  logger.debug(chalk.magenta(`Registered Domain event handler for ${event.name}`))
  const current = domainHandlerMap.get(event) || []
  current.push(handler)
  domainHandlerMap.set(event, current)
}

const registerIntegrationEventHandler = (
  event: Constructor<unknown>,
  handler: NamedHandlerWithDependencies,
) => {
  logger.debug(chalk.magenta(`Registered Integration event handler for ${event.name}`))
  const current = integrationHandlerMap.get(event) || []
  current.push(handler)
  integrationHandlerMap.set(event, current)
}

// tslint:disable-next-line:ban-types
const domainHandlerMap = new Map<unknown, UsecaseWithDependencies[]>() // Array<readonly [Function, Function, {}]>
const integrationHandlerMap = new Map<unknown, NamedHandlerWithDependencies[]>() // Array<readonly [Function, Function, {}]>

export { registerDomainEventHandler, registerIntegrationEventHandler }
