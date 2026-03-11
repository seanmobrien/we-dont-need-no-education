/* global BodyInit, RequestCache, RequestCredentials, RequestMode, RequestPriority, RequestRedirect, ReferrerPolicy, AbortSignal */

type ResponseType = typeof globalThis['Response'];
type RequestType = typeof globalThis['Request'];

export type Response = ResponseType;

export type Request = RequestType;

export type RequestInfo = string | URL | RequestType;

export type RequestInit = {
    body?: BodyInit | null;
    cache?: RequestCache;
    credentials?: RequestCredentials;
    headers?: Record<string, string | string[]> | Headers | [string, string | string[]][];
    integrity?: string;
    keepalive?: boolean;
    method?: string;
    mode?: RequestMode;
    priority?: RequestPriority;
    redirect?: RequestRedirect;
    referrer?: string;
    referrerPolicy?: ReferrerPolicy;
    signal?: AbortSignal | null;
    timeout?: number;
    window?: null;
};
