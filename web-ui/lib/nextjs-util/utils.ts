import { IncomingMessage, OutgoingMessage, ServerResponse } from 'http';
import {
  isNextApiRequest,
  isNextRequest,
  isNextResponse,
  isNextApiResponse,
} from './guards';
import { LikeNextRequest, LikeNextResponse } from './types';
import { isPromise } from '../typescript';
import { getStackTrace } from './get-stack-trace';

type HeadersLikeNextRequestOrResponse = {
  headers: Headers;
};

export const getHeaderValue = (
  req: LikeNextRequest | LikeNextResponse | OutgoingMessage,
  headerName: string,
): typeof req extends infer TActual
  ? TActual extends HeadersLikeNextRequestOrResponse
    ? string | string[] | undefined
    : TActual extends OutgoingMessage
      ? string | string[] | undefined | number
      : TActual extends IncomingMessage
        ? string | null
        : TActual extends ServerResponse
          ? string | string[] | undefined
          : never
  : never => {
  if (isNextApiRequest(req) || req instanceof IncomingMessage) {
    return req.headers[headerName.toLowerCase()];
  }
  if (isNextRequest(req) || isNextResponse(req)) {
    return req.headers.get(headerName);
  }
  if (isNextApiResponse(req) || req instanceof OutgoingMessage) {
    return req.getHeader(headerName);
  }
  return null;
};

export const extractParams = async <T extends object>(req: {
  params: T | Promise<T>;
}): Promise<T> => {
  if (!req.params) {
    throw new Error('No params found');
  }
  if (isPromise(req.params)) {
    return await req.params;
  }
  return req.params;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const deprecate = <T extends (...args: any[]) => any>(
  fn: T,
  message = `The ${fn.name} function is deprecated.`,
  code = 'DEP000',
) => {
  const stack = getStackTrace({ skip: 2, myCodeOnly: true });
  const deprecatedFn = function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): ReturnType<T> {
    process.emitWarning(`${message}\nStack Trace:\n${stack}`, {
      code,
      type: 'DeprecationWarning',
    });
    return fn.apply(this, args);
  } as T;

  // Add a JSDoc @deprecated tag dynamically for IDE recognition
  Object.defineProperty(deprecatedFn, 'toString', {
    value: () => `/ ** @deprecated ${message} * /\n${fn.toString()}`,
  });

  return deprecatedFn;
};
