import type { IncomingMessage, OutgoingMessage, ServerResponse } from 'http';
import { isNextApiRequest, isNextApiResponse, isNextRequest, isNextResponse } from './guards';
import type { LikeNextRequest } from './types/like-nextrequest';
import type { LikeNextResponse } from './types/like-nextresponse';

type HeadersLikeNextRequestOrResponse = {
    headers: Headers;
};

export const getHeaderValue = (
    req: LikeNextRequest | LikeNextResponse | OutgoingMessage,
    headerName: string
): typeof req extends infer TActual
    ? TActual extends HeadersLikeNextRequestOrResponse
    ? string | string[] | null
    : TActual extends OutgoingMessage
    ? string | string[] | null | number
    : TActual extends IncomingMessage
    ? string | null
    : TActual extends ServerResponse
    ? string | string[] | null
    : never
    : never => {
    if (isNextApiRequest(req)) {
        return req.headers[headerName.toLowerCase()] ?? null;
    }
    if (isNextRequest(req) || isNextResponse(req)) {
        return req.headers.get(headerName) ?? null;
    }
    if (isNextApiResponse(req)) {
        return req.getHeader(headerName) ?? null;
    }
    if (typeof req === 'object' && 'getHeader' in req) {
        const asResponse = req as {
            getHeader: (headerName: string) => string | string[] | null;
        };
        if (typeof asResponse.getHeader === 'function') {
            return asResponse.getHeader(headerName) ?? null;
        }
    }
    if (!!req && 'headers' in req) {
        const asHeaders = req as {
            headers: { get: (headerName: string) => string | string[] | null };
        };
        if (typeof asHeaders.headers.get === 'function') {
            return asHeaders.headers.get(headerName) ?? null;
        }
        return (
            (req as { headers: Record<string, string> }).headers?.[
            headerName.toLowerCase()
            ] ?? null
        );
    }
    return null;
};