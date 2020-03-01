import {
  err,
  ok,
  Result,
  pipe,
  E,
  errorishToEither,
  EDo,
} from "@fp-app/fp-ts-extensions"
import Joi, { ValidationResult } from "@hapi/joi"
import {
  CombinedValidationError,
  FieldValidationError,
  ValidationError,
} from "../errors"
export { Joi }
import { convert } from "@yeongjet/joi-to-json-schema"
import { logger } from "./logger"

const createValidator = <TIn>(
  schema: Joi.Schema,
): ValidatorType<TIn, ValidationError> => {
  const validator = (object: TIn): Result<TIn, ValidationError> => {
    const r = schema.validate(object, { abortEarly: false })
    return mapValidationResult(r)
  }
  validator.jsonSchema = convert(schema)
  return validator
}

const mapValidationResult = (result: ValidationResult) =>
  pipe(
    errorishToEither(result),
    EDo(x => x.warning && logger.warn("Warning during validation: " + x.warning)),
    E.map(x => x.value),
    E.mapLeft(joiValidationErrorToCombinedValidationError),
  )
// Alternative:
// if (r.error) {
//   return err(
//     joiValidationErrorToCombinedValidationError(r.error),
//   )
// }
// return ok(r.value)

// Alt2:
// return r.error
//  ? err(joiValidationErrorToCombinedValidationError(r.error))
//  : ok(r.value)

export type ValidatorType<TIn, TErr> = ((object: TIn) => Result<TIn, TErr>) & {
  jsonSchema: string
}

const joiValidationErrorToCombinedValidationError = (x: Joi.ValidationError) =>
  new CombinedValidationError(
    x.details.map(x => new FieldValidationError(x.path.join("."), x)),
  )

const predicate = <T, E extends ValidationError>(
  pred: (inp: T) => boolean,
  errMsg: string,
) => (inp: T): Result<T, E | ValidationError> => {
  if (pred(inp)) {
    return ok(inp)
  }
  return err(new ValidationError(errMsg))
}

const valueEquals = <T, TExtracted>(
  { value }: { value: T },
  otherValue: T,
  extracter?: (v: T) => TExtracted,
) => (extracter ? extracter(value) === extracter(otherValue) : value === otherValue)
const valueEquals2 = <T, TExtracted>(
  { value }: { value: T },
  { value: otherValue }: { value: T },
  extracter?: (v: T) => TExtracted,
) => (extracter ? extracter(value) === extracter(otherValue) : value === otherValue)

export { createValidator, predicate, valueEquals, valueEquals2 }
