/**
 * - A value object has no identifier, unlike an Entity.
 * - A value object is equal to another value object of the same type
 *   when the composition of values equals that of the other object.
 *   Unlike an Entity.
 * - A value object is usually constructed through a Factory, e.g static create()
 *   and has a private constructor. The factory returns an Either<Error,{TypeOfValue}>
 *   documenting the various Errors that may occur constructing the Value.
 */
export default class Value {}
