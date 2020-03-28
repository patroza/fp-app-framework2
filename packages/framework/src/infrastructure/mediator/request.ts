import {
  NamedHandlerWithDependencies,
  requestType,
  NamedRequestHandler,
} from "./registry"

const request = (get: getRequestType): requestType => (requestHandler, input) => {
  const handler = get(requestHandler)
  return handler(input)
}

export default request

type getRequestType = <TInput, TOutput, TError>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  key: NamedHandlerWithDependencies<any, TInput, TOutput, TError>,
) => NamedRequestHandler<TInput, TOutput, TError>
