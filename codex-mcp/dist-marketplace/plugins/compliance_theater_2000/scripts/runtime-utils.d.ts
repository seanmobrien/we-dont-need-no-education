export type Logger = (message: string, details?: unknown) => void;
export type Token = {
    access_token?: string;
    expires_at?: number | string;
    expires_at_ms?: number | string;
    expires_at_iso?: string;
    expires_in?: number | string;
    cached_at?: number;
    app_session?: AppSession;
    [key: string]: unknown;
};
export type AppSession = {
    token?: string;
    cookie_name?: string;
    expires_at?: number | string;
    expires_at_ms?: number | string;
    expires_at_iso?: string;
    expires_in?: number | string;
    [key: string]: unknown;
};
export type JsonRpcParams = Record<string, unknown>;
export type RpcReader = ReadableStreamDefaultReader<Uint8Array>;
export type FetchPolicyOptions = RequestInit & {
    timeoutMs?: number;
    retries?: number;
    retryBaseMs?: number;
    logger?: Logger;
};
type SessionResult = {
    response?: Pick<Response, "ok">;
    body?: {
        status?: string;
    };
};
export type SseConnection = {
    endpoint: string;
    reader: RpcReader;
};
export type HttpDispatcherOptions = {
    connections: number;
    pipelining: number;
    keepAliveTimeout: number;
    keepAliveMaxTimeout: number;
};
export declare function httpDispatcherOptionsFromEnv(): HttpDispatcherOptions;
export declare function sleep(ms: number): Promise<void>;
export declare function parseNumber(value: unknown, fallback: number, minimum?: number): number;
export declare function tokenExpiresAt(token: Token | AppSession, fallbackMs?: number): number;
export declare function isUsableCachedToken(token?: Token, skewMs?: number): boolean;
export declare function isUsableCachedAppSession(token?: Token, skewMs?: number): boolean;
export declare function appSessionCookieHeader(session?: AppSession): string | undefined;
export declare function readCachedTokenFile(tokenCachePath: string, { skewMs, logger }?: {
    skewMs?: number;
    logger?: Logger;
}): Promise<Token | undefined>;
export declare function writeCachedTokenFile(tokenCachePath: string, token: Token, { fallbackMs, logger }?: {
    fallbackMs?: number;
    logger?: Logger;
}): Promise<Token>;
export declare function backoffDelayMs(attempt: number, retryBaseMs: number): number;
export declare function shouldRetryStatus(status: number): boolean;
export declare function shouldRetryError(error: unknown): boolean;
export declare function fetchWithPolicy(url: string | URL, options?: FetchPolicyOptions): Promise<Response>;
export declare function warnIfInsecureUrl(urlString: string, logger?: Logger, label?: string): void;
export declare function isAuthenticatedSessionResult(sessionResult?: SessionResult): boolean;
export declare function resolveEndpoint(endpoint: string, baseUrl: string): string;
export declare function connectSse({ sseUrl, accessToken, sessionCookie, timeoutMs, httpTimeoutMs, httpRetries, httpRetryBaseMs, logger }: {
    sseUrl: string;
    accessToken?: string;
    sessionCookie?: string;
    timeoutMs?: number;
    httpTimeoutMs?: number;
    httpRetries?: number;
    httpRetryBaseMs?: number;
    logger?: Logger;
}): Promise<SseConnection>;
export declare function rpc(endpoint: string, accessToken: string | undefined, id: string | number, method: string, params: JsonRpcParams, { timeoutMs, retries, retryBaseMs, logger, sessionCookie }?: {
    timeoutMs?: number;
    retries?: number;
    retryBaseMs?: number;
    logger?: Logger;
    sessionCookie?: string;
}): Promise<void>;
export declare function readRpcResult(reader: RpcReader, expectedId: string | number, timeoutMs?: number): Promise<Record<string, unknown>>;
export {};
//# sourceMappingURL=runtime-utils.d.ts.map