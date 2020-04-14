// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConstructorFunction<T = unknown> = (...args: any[]) => T
export type Constructable<T = unknown> = Constructor<T> & ConstructorFunction<T>
export type AnyConstructable<T = unknown> = Constructor<T> | ConstructorFunction<T>
export type Writeable<T> = { -readonly [P in keyof T]-?: T[P] }

export interface Disposable {
  dispose: () => void
}

export const unit = void 0 as void
