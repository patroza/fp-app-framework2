/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Get rid of the "keys" as required concept.
// TODO: There's obviously a lot of possibility to improve the API, and Implementation here ;-)
import "reflect-metadata"
import { setFunctionName } from "../utils"
import {
  Constructor,
  Disposable,
  ConstructorFunction,
  Constructable,
  AnyConstructable,
} from "../types"
import { assert } from "../utils"
import { isClass } from "typechecker/edition-node-12"
import { DependencyDefinitions, Dependencies } from "./configure"

export default class SimpleContainer {
  private factories = new Map()
  private singletonScope = new DependencyScope()
  private decorators = new Map()
  private initializers = new Map()
  constructor(
    private tryGetDependencyScope: () => DependencyScope,
    private setDependencyScope: (scope: DependencyScope) => void,
  ) {}

  getC<T>(key: Constructor<T>): T {
    const instance = this.tryCreateInstance<T>(key)
    if (!instance) {
      throw new Error(`could not resolve ${key}`)
    }
    return instance
  }

  // tslint:disable-next-line:ban-types
  getF<T extends Function>(key: ConstructorFunction<T>): T {
    const f = this.tryCreateInstance<T>(key)
    if (!f) {
      throw new Error(`could not resolve ${key}`)
    }
    return f
  }

  getConcrete<TDependencies, T>(key: (deps: TDependencies) => T): T {
    const f = this.tryCreateInstance<T>(key)
    if (!f) {
      throw new Error(`could not resolve ${key}`)
    }
    return f
  }

  get<T>(key: AnyConstructable<T>): T {
    const f = this.tryCreateInstance<T>(key)
    if (!f) {
      throw new Error(`could not resolve ${key}`)
    }
    return f
  }

  createScope() {
    const scope = new DependencyScope()
    this.setDependencyScope(scope)
    return {
      dispose: () => scope.dispose(),
    }
  }

  registerTransientF<T>(key: ConstructorFunction<T>, factory: () => T) {
    this.registerFactoryF(key, factory)
  }

  registerPassthrough<T>(key: T, key2: T) {
    this.factories.set(key, this.factories.get(key2))
  }

  registerScopedF<TDependencies, T>(
    key: AnyConstructable<T>,
    impl: WithDependenciesConfig<TDependencies, T>,
  ) {
    const factory = () => this.createFunctionInstance(impl)
    setFunctionName(factory, impl.name || `f(${key.name}`)
    this.registerFactoryF(key, factory, this.getDependencyScope)
  }

  registerSingletonF<TDependencies, T>(
    key: AnyConstructable<T>,
    impl: WithDependenciesConfig<TDependencies, T>,
  ) {
    const factory = () => this.createFunctionInstance(impl)
    setFunctionName(factory, impl.name || `f(${key.name}`)
    this.registerFactoryF(key, factory, this.getSingletonScope)
  }

  registerSingletonConcrete<TDependencies, T>(
    key: WithDependenciesConfig<TDependencies, T> | (() => T),
    factory?: () => T,
  ) {
    if (!factory) {
      factory = () => this.createFunctionInstance(key)
      setFunctionName(factory, key.name)
    }

    this.registerFactoryF(key, factory, this.getSingletonScope)
  }

  registerScopedConcrete<TDependencies, T>(
    key: WithDependenciesConfig<TDependencies, T> | (() => T),
    factory?: () => T,
  ) {
    if (!factory) {
      factory = () => this.createFunctionInstance(key)
      setFunctionName(factory, key.name)
    }

    this.registerFactoryF(key, factory, this.getDependencyScope)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerDecorator<T extends (...args: any[]) => any>(
    forKey: T,
    ...decorators: unknown[]
  ) {
    decorators.forEach((x) => assert(x !== null, "decorator must not be null"))
    const current = this.decorators.get(forKey) || []
    current.push(...decorators)
    this.decorators.set(forKey, current)
  }

  registerSingletonC<T>(key: Constructor<T>, impl: Constructor<T>) {
    const factory = () => this.createNewInstance(impl)
    this.registerFactoryC(key, factory, this.getSingletonScope)

    // Also register the concrete implementation
    this.factories.set(impl, this.factories.get(key))
  }

  registerScopedC<T>(key: Constructor<T>, impl: Constructor<T>) {
    const factory = () => this.createNewInstance(impl)
    this.registerFactoryC(key, factory, this.getDependencyScope)
    // Also register the concrete implementation
    this.factories.set(impl, this.factories.get(key))
  }

  registerInstanceF<T>(key: ConstructorFunction<T>, instance: T) {
    this.registerFactoryF(key, () => instance)
  }

  registerInitializer<TKey extends AnyConstructable<T>, T = any>(
    key: TKey | "global",
    ...initializers: ((f: T, key: TKey) => void)[]
  ) {
    const current = this.initializers.get(key) || []
    this.initializers.set(key, current.concat(initializers))
  }

  private createNewInstance<T>(constructor: Constructor<T>) {
    const keys = getDependencyKeys(constructor)
    let instance
    if (keys) {
      instance = new constructor(...keys.map((x) => this.get(x)))
    } else {
      instance = new constructor()
    }

    return instance
  }

  private readonly getDependencyScope = () => {
    const scope = this.tryGetDependencyScope()
    if (!scope) {
      throw new Error("There is no scope available, did you forget to .createScope()?")
    }
    return scope
  }

  private readonly getSingletonScope = () => this.singletonScope

  private registerFactoryC<T>(
    key: unknown,
    factory: () => T,
    getScope?: () => DependencyScope,
  ) {
    this.registerFactory(key, factory, getScope)
  }
  private registerFactoryF<T>(
    key: unknown,
    factory: () => T,
    getScope?: () => DependencyScope,
  ) {
    this.registerFactory(key, fixFunctionNameFactoryWrapper(key, factory), getScope)
  }

  private registerFactory<T>(
    key: any,
    factory: () => T,
    getScope?: () => DependencyScope,
  ) {
    factory = this.hookInitializers(key, this.resolveDecorators(key, factory))
    if (!getScope) {
      this.factories.set(key, factory)
      return
    }
    this.factories.set(key, () => getScope().getOrCreate(key, factory))
  }

  private hookInitializers = (key: any, factory: any) => () => {
    const instance = factory()
    this.runInitializers(key, instance)
    return instance
  }

  private runInitializers(key: any, instance: any) {
    const globalInitializers = this.initializers.get("global")
    if (globalInitializers) {
      for (const i of globalInitializers) {
        i(instance, key)
      }
    }
    const initializers = this.initializers.get(key)
    if (!initializers || !initializers.length) {
      return
    }
    for (const i of initializers) {
      i(instance, key)
    }
  }

  private readonly createFunctionInstance = <TDependencies, T>(
    h: WithDependenciesConfig<TDependencies, T> | (() => T),
  ) => {
    const deps = getDependencyObjectKeys<TDependencies>(h)
    const resolved = h(this.resolveDependencies(deps))
    // setFunctionName(resolved, h.name)
    return resolved
  }

  private readonly resolveDependencies = <TDependencies>(deps: TDependencies) =>
    Object.keys(deps).reduce((prev, cur) => {
      const dAny = deps as any
      const key = dAny[cur]
      const pAny = prev as any
      pAny[cur] = this.get(key)
      return prev
    }, {} as Dependencies<TDependencies>)

  private tryCreateInstance = <T>(key: any) => {
    const factory = this.factories.get(key)
    if (!factory) {
      if (!isClass(key)) {
        return this.createFunctionInstance(key)
      }
      return new key()
    }
    const instance = factory() as T
    // if (!(instance as any).name) { setFunctionName(instance, key.name) }
    return instance
  }

  private readonly resolveDecorators = <T extends (...args: any[]) => any>(
    key: T,
    factory: () => T,
  ) => () => {
    const decorators = this.decorators.get(key) || []

    if (!decorators.length) {
      return factory()
    }
    let handler = factory()
    const name = handler.name
    decorators.forEach((decorator: () => (inp: T) => T) => {
      // Be sure not to use `handler` as it can be rebound :-)
      const currentHandler = handler
      const anyDecoratedHandler: any = (...args: any[]) => {
        const decorate = this.get(decorator)
        const decoratedHandler = decorate(currentHandler)
        return decoratedHandler(...args)
      }
      handler = anyDecoratedHandler
    })
    setFunctionName(handler, `$<${name}>`)
    return handler
  }
}

const fixFunctionNameFactoryWrapper = (key: any, factory: any) => () => {
  const instance = factory()
  if (!instance.name && typeof instance === "function") {
    setFunctionName(instance, factory.name || key.name)
  }
  return instance
}

// tslint:disable-next-line:max-classes-per-file
export class DependencyScope implements Disposable {
  instances: Map<any, any> = new Map()

  getOrCreate<T>(key: any, instanceCreator: () => T) {
    if (this.instances.has(key)) {
      return this.instances.get(key)
    }
    const instance = instanceCreator()
    this.instances.set(key, instance)
    return instance
  }

  dispose() {
    for (const d of this.instances.values()) {
      if (d.dispose) {
        d.dispose()
      }
    }
  }
}

export const injectSymbol = Symbol("$$inject")
export const requestTypeSymbol = Symbol("$$type")

export function generateKey<T>(name: string): Key<T> {
  const f = () => {
    throw new Error(`${name} not implemented function`)
  }
  if (name) {
    setFunctionName(f, name)
  }
  return f as any
}

export type Key<T> = Constructable<T> & { $$$KEY: "$$$KEY"; name: string }
export type UnpackKey<T> = T extends Key<infer X> ? X : never

/**
 * Registers the specified dependencyConstructors as the dependencies for the targeted class.
 *
 * Configuration will be inherited. Consecutive calls override the previous.
 * @param {Array<Function>} dependencyConstructors
 */
export const inject = (...dependencyConstructors: any[]): ClassDecorator => {
  dependencyConstructors.forEach((dependencyConstructor) =>
    assert.isNotNull({ dependencyConstructor }),
  )
  // NOTE: Must have a {..} scope here or the Decorators exhibit weird behaviors..
  return (target: any) => {
    target[injectSymbol] = dependencyConstructors
  }
}

export const paramInject = (dependencyConstructor: any): ParameterDecorator => {
  assert.isNotNull({ dependencyConstructor })
  return (target: any, _: string | symbol, parameterIndex: number) => {
    if (!target[injectSymbol]) {
      target[injectSymbol] = []
    }
    target[injectSymbol][parameterIndex] = dependencyConstructor
  }
}

export const autoinject = (target: any) => {
  const metadata = Reflect.getMetadata("design:paramtypes", target) as any[]
  metadata.forEach((dependencyConstructor) =>
    assert.isNotNull({ dependencyConstructor }),
  )

  // merge existing (ie placed by paraminject)
  if (Object.getOwnPropertySymbols(target).includes(injectSymbol)) {
    const existing = target[injectSymbol]
    const newInject = [...metadata]
    let i = 0
    for (const dep of existing) {
      if (dep) {
        newInject[i] = dep
      }
      i++
    }
    target[injectSymbol] = newInject
  } else {
    target[injectSymbol] = metadata
  }
}

const getDependencyKeys = (constructor: any) =>
  (constructor[injectSymbol] as any[]) || []
const getDependencyObjectKeys = <TDependencies>(constructor: any): TDependencies => {
  let deps = constructor[injectSymbol]
  if (typeof deps === "function") {
    deps = deps()
    constructor[injectSymbol] = deps
  }
  return deps || {}
}

export type WithDependencies<TDependencies, T> = (
  deps: Dependencies<TDependencies>,
) => T
export interface InjectedDependencies<TDependencies> {
  [injectSymbol]?: TDependencies | (() => TDependencies)
}
export type WithDependenciesConfig<TDependencies extends DependencyDefinitions, T> = ((
  deps: Dependencies<TDependencies>,
) => T) &
  InjectedDependencies<TDependencies>
