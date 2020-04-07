export function assertIsNotNullish<T>(
  input: T | null | undefined,
  name?: string | Record<string, unknown>,
): asserts input is T {
  if (input == null) {
    throw new TypeError(
      `${typeof name === "object" ? Object.keys(name)[0] : name} is null or undefined`,
    )
  }
}

export function assertIsNotNull<T>(
  input: T | null,
  name?: string | Record<string, unknown>,
): asserts input is T {
  if (input === null) {
    throw new TypeError(
      `${typeof name === "object" ? Object.keys(name)[0] : name} is null`,
    )
  }
}

export function assertIsNotUndefined<T>(
  input: T | undefined,
  name?: string | Record<string, unknown>,
): asserts input is T {
  if (input === undefined) {
    throw new TypeError(
      `${typeof name === "object" ? Object.keys(name)[0] : name} is undefined`,
    )
  }
}
