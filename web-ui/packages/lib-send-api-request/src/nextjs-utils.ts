import type { IncomingMessage, OutgoingMessage, ServerResponse } from 'http';
import {
  isNextApiRequest,
  isNextRequest,
  isNextResponse,
  isNextApiResponse,
} from './nextjs-guards';
import { LikeNextRequest, LikeNextResponse } from './nextjs-types';

type HeadersLikeNextRequestOrResponse = {
  headers: Headers;
};

export const getHeaderValue = (
  req: LikeNextRequest | LikeNextResponse | OutgoingMessage,
  headerName: string
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
