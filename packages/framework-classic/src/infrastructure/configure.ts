import { A } from "ts-toolbelt"
import { Constructor } from "@fp-app/framework"
import { injectSymbol, Key } from "./SimpleContainer"

/**
 * Configures a function for dependency injection, dependency types are automatically inferred based on
 * the passed `deps` configuration. Dependency configuration is provided as last argument.
 */
export function configure<
  TDependencies extends DependencyDefinitions,
  TFunctionConstructor extends (
    dependencies: A.Compute<Dependencies<TDependencies>>,
  ) => TFunction,
  TFunction
>(func: TFunctionConstructor, deps: () => TDependencies) {
  return configureDepsFirst<TDependencies, TFunctionConstructor, TFunction>(deps, func)
}

/**
 * Configures a function for dependency injection, dependency types are automatically inferred based on
 * the passed `deps` configuration. Dependency configuration is provided as first argument.
 */
function configureDepsFirst<
  TDependencies extends DependencyDefinitions,
  TFunctionConstructor extends (
    dependencies: A.Compute<Dependencies<TDependencies>>,
  ) => TFunction,
  TFunction
>(deps: () => TDependencies, func: TFunctionConstructor) {
  const injectedFunc = func as ConfiguredFunction<
    TDependencies,
    TFunctionConstructor,
    TFunction
  >
  injectedFunc[injectSymbol] = deps
  return injectedFunc
}

export function createGroupOfDependencies<TDependencies extends DependencyDefinitions>(
  deps: () => TDependencies,
) {
  return configure(function (resolvedDependencies) {
    return resolvedDependencies
  }, deps)
}

// export function useInstanceForFunction(container: DependencyInjectionContainer) {
//   return <T, TFunction extends Function>(cls: Constructor<T>, selector: (instance: T) => TFunction) => () => {
//     const instance = container.get(cls)
//     return selector(instance).bind(instance)
//   }
// }

export interface DependencyDefinitions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Constructor | ConfiguredFunction<any, any, unknown> | unknown
}

export type Dependencies<T extends DependencyDefinitions> = {
  [P in keyof T]: T[P] extends Constructor
    ? InstanceType<T[P]>
    : T[P] extends Key<infer X>
    ? X
    : T[P] extends SomeFunction
    ? ReturnType<T[P]>
    : T[P]["prototype"]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SomeFunction = (...args: any[]) => any

export type ConfiguredFunction<
  TDependencies extends DependencyDefinitions,
  TFunctionConstructor extends (
    dependencies: A.Compute<Dependencies<TDependencies>>,
  ) => TFunction,
  TFunction
> = TFunctionConstructor & {
  [injectSymbol]: (() => TDependencies) | TDependencies
}

// Workaround for container register* signature not setup to support functions yet.
export const adaptFunctionForRegistration = <TFunction>(func: {
  (...args: unknown[]): TFunction
  [injectSymbol]: DependencyDefinitions
}) => (func as unknown) as Constructor<TFunction>
