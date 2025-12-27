import EventEmitter from '@protobufjs/eventemitter';
import type { IncomingMessage, OutgoingMessage, ServerResponse } from 'http';
import { log } from '@repo/lib-logger/core';
import {
  isNextApiRequest,
  isNextRequest,
  isNextResponse,
  isNextApiResponse,
} from './guards';
import { LikeNextRequest, LikeNextResponse } from './types';
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
  if (isNextApiRequest(req)) {
    return req.headers[headerName.toLowerCase()];
  }
  if (isNextRequest(req) || isNextResponse(req)) {
    return req.headers.get(headerName);
  }
  if (isNextApiResponse(req)) {
    return req.getHeader(headerName);
  }
  if (typeof req === 'object' && 'getHeader' in req) {
    const asResponse = req as {
      getHeader: (headerName: string) => string | string[] | undefined;
    };
    if (typeof asResponse.getHeader === 'function') {
      return asResponse.getHeader(headerName);
    }
  }
  if (!!req && 'headers' in req) {
    const asHeaders = req as {
      headers: { get: (headerName: string) => string | string[] | undefined };
    };
    if (typeof asHeaders.headers.get === 'function') {
      return asHeaders.headers.get(headerName);
    }
    return (
      (req as { headers: Record<string, string> }).headers?.[
        headerName.toLowerCase()
      ] ?? null
    );
  }
  return null;
};

// When we're running on node we can process.emitWarning
const warnDeprecatedOnNode = (
  message: string,
  options: { code: string; type: string },
) => process.emitWarning(message, options);

// When we're running on edge or browser we can log to console
const warnDeprecatedOffNode = (
  message: string,
  options: { code: string; type: string },
) =>
  log((l) =>
    l.warn(
      `${options.type ?? 'DeprecationWarning'} ${options.code ?? 'DEP000'}: ${message}`,
    ),
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const deprecate = <T extends (...args: any[]) => any>(
  fn: T,
  message = `The ${fn.name} function is deprecated.`,
  code = 'DEP000',
) => {
  const stack = getStackTrace({ skip: 2, myCodeOnly: true });
  const formattedMessage = `${message}\n${stack}`;
  const deprecatedFn = function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): ReturnType<T> {
    const options = { code: code ?? 'DEP000', type: 'DeprecationWarning' };
    if ((process.env.NEXT_RUNTIME ?? '').toLowerCase() === 'edge') {
      // process.emitWarning is no bueno on edge or browser runtimes, so we do a console.warn instead
      warnDeprecatedOffNode(formattedMessage, options);
    } else {
      // But is super-awesome on node runtimes, so we use it
      warnDeprecatedOnNode(formattedMessage, options);
    }
    return fn.apply(this, args);
  } as T;

  // Add a JSDoc @deprecated tag dynamically for IDE recognition
  Object.defineProperty(deprecatedFn, 'toString', {
    value: () => `/ ** @deprecated ${message} * /\n${fn.toString()}`,
  });

  return deprecatedFn;
};

type EmittingDispose = {
  [Symbol.dispose]: () => void;
  addDisposeListener: (listener: () => void) => void;
  removeDisposeListener: (listener: () => void) => void;
};

export const withEmittingDispose = <T>(input: T): T & EmittingDispose => {
  const emitter = new EventEmitter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalDispose = (input as any)[Symbol.dispose];
  const dispose = () => {
    if (originalDispose) {
      originalDispose();
    }
    emitter.emit('dispose');
    emitter.off();
  };
  const ret = input as T & Partial<EmittingDispose>;
  ret[Symbol.dispose] = dispose;
  ret.addDisposeListener = (listener: () => void) => {
    emitter.on('dispose', listener);
  };
  ret.removeDisposeListener = (listener: () => void) => {
    emitter.off('dispose', listener);
  };
  return ret as T & Required<EmittingDispose>;
};
