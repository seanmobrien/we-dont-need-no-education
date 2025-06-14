import { IncomingMessage, OutgoingMessage, ServerResponse } from 'http';
import {
  isNextApiRequest,
  isNextRequest,
  isNextResponse,
  isNextApiResponse,
} from './guards';
import { LikeNextRequest, LikeNextResponse } from './types';
import { isPromise } from '../typescript';

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
