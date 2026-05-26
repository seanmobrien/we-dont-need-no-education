"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.parseNumber = parseNumber;
exports.tokenExpiresAt = tokenExpiresAt;
exports.isUsableCachedToken = isUsableCachedToken;
exports.isUsableCachedAppSession = isUsableCachedAppSession;
exports.appSessionCookieHeader = appSessionCookieHeader;
exports.readCachedTokenFile = readCachedTokenFile;
exports.writeCachedTokenFile = writeCachedTokenFile;
exports.backoffDelayMs = backoffDelayMs;
exports.shouldRetryStatus = shouldRetryStatus;
exports.shouldRetryError = shouldRetryError;
exports.fetchWithPolicy = fetchWithPolicy;
exports.warnIfInsecureUrl = warnIfInsecureUrl;
exports.isAuthenticatedSessionResult = isAuthenticatedSessionResult;
exports.resolveEndpoint = resolveEndpoint;
exports.connectSse = connectSse;
exports.rpc = rpc;
exports.readRpcResult = readRpcResult;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set(["ABORT_ERR", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"]);
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function parseNumber(value, fallback, minimum = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.max(parsed, minimum);
}
function tokenExpiresAt(token, fallbackMs = 300000) {
    const explicit = normalizeEpochMs(token.expires_at_ms ?? token.expires_at);
    if (explicit) {
        return explicit;
    }
    if (token.expires_in) {
        return Date.now() + Number(token.expires_in) * 1000;
    }
    return Date.now() + fallbackMs;
}
function isUsableCachedToken(token, skewMs = 60000) {
    if (!token?.access_token) {
        return false;
    }
    return tokenExpiresAt(token, 0) - skewMs > Date.now();
}
function isUsableCachedAppSession(token, skewMs = 60000) {
    const session = token?.app_session;
    if (!session?.token || !session?.cookie_name) {
        return false;
    }
    return tokenExpiresAt(session, 0) - skewMs > Date.now();
}
function appSessionCookieHeader(session) {
    if (!session?.token || !session?.cookie_name) {
        return undefined;
    }
    return `${session.cookie_name}=${session.token}`;
}
async function readCachedTokenFile(tokenCachePath, { skewMs = 60000, logger = () => { } } = {}) {
    try {
        const cached = JSON.parse(await (0, promises_1.readFile)(tokenCachePath, "utf8"));
        if (isUsableCachedToken(cached, skewMs)) {
            logger(`using cached access token from ${tokenCachePath}`);
            return cached;
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
async function writeCachedTokenFile(tokenCachePath, token, { fallbackMs = 300000, logger = () => { } } = {}) {
    const cached = {
        ...token,
        expires_at: tokenExpiresAt(token, fallbackMs),
        expires_at_iso: new Date(tokenExpiresAt(token, fallbackMs)).toISOString(),
        cached_at: Date.now()
    };
    await (0, promises_1.mkdir)((0, node_path_1.dirname)(tokenCachePath), { recursive: true });
    await (0, promises_1.writeFile)(tokenCachePath, JSON.stringify(cached, null, 2), { mode: 0o600 });
    logger(`cached access token at ${tokenCachePath}`);
    return cached;
}
function backoffDelayMs(attempt, retryBaseMs) {
    return retryBaseMs * (2 ** attempt);
}
function shouldRetryStatus(status) {
    return RETRYABLE_STATUS_CODES.has(status);
}
function shouldRetryError(error) {
    const retriable = error;
    const code = retriable?.code || retriable?.cause?.code;
    if (code && RETRYABLE_ERROR_CODES.has(code)) {
        return true;
    }
    return String(retriable?.message || "").toLowerCase().includes("fetch failed");
}
function timeoutError(timeoutMs) {
    const error = new Error(`Request timed out after ${timeoutMs}ms`);
    error.code = "ABORT_ERR";
    return error;
}
async function fetchWithPolicy(url, options = {}) {
    const { timeoutMs = 15000, retries = 0, retryBaseMs = 500, logger = () => { }, ...fetchOptions } = options;
    for (let attempt = 0;; attempt += 1) {
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
            if (response.ok || attempt >= retries || !shouldRetryStatus(response.status)) {
                return response;
            }
            await response.body?.cancel?.().catch(() => { });
            const waitMs = backoffDelayMs(attempt, retryBaseMs);
            logger(`retrying ${url} after HTTP ${response.status} in ${waitMs}ms`);
            await sleep(waitMs);
        }
        catch (error) {
            const caught = error;
            const normalizedError = caught?.name === "AbortError" ? timeoutError(timeoutMs) : caught;
            if (attempt >= retries || !shouldRetryError(normalizedError)) {
                throw normalizedError;
            }
            const waitMs = backoffDelayMs(attempt, retryBaseMs);
            logger(`retrying ${url} after ${normalizedError.message || "request error"} in ${waitMs}ms`);
            await sleep(waitMs);
        }
        finally {
            clearTimeout(timeoutHandle);
        }
    }
}
function isLoopbackHost(hostname) {
    const normalized = String(hostname || "").replace(/^\[|\]$/g, "");
    return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}
function warnIfInsecureUrl(urlString, logger = () => { }, label = "URL") {
    try {
        const parsed = new URL(urlString);
        if (parsed.protocol === "http:" && !isLoopbackHost(parsed.hostname)) {
            logger(`${label} is using insecure HTTP: ${urlString}`);
        }
    }
    catch {
        return;
    }
}
function isAuthenticatedSessionResult(sessionResult) {
    return Boolean(sessionResult?.response?.ok && sessionResult?.body?.status === "authenticated");
}
function resolveEndpoint(endpoint, baseUrl) {
    return new URL(endpoint, baseUrl).toString();
}
function requestAuthHeaders(accessToken, sessionCookie) {
    if (sessionCookie) {
        return { Cookie: sessionCookie };
    }
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}
async function readWithTimeout(reader, timeoutMs, errorMessage) {
    let timeoutHandle;
    try {
        return await Promise.race([
            reader.read(),
            new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
            })
        ]);
    }
    finally {
        clearTimeout(timeoutHandle);
    }
}
async function connectSse({ sseUrl, accessToken, sessionCookie, timeoutMs = 30000, httpTimeoutMs = 15000, httpRetries = 1, httpRetryBaseMs = 500, logger = () => { } }) {
    logger(`connecting SSE: ${sseUrl}`);
    const response = await fetchWithPolicy(sseUrl, {
        headers: {
            Accept: "text/event-stream",
            ...requestAuthHeaders(accessToken, sessionCookie)
        },
        timeoutMs: httpTimeoutMs,
        retries: httpRetries,
        retryBaseMs: httpRetryBaseMs,
        logger
    });
    if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        throw new Error(`SSE connect failed with HTTP ${response.status}: ${text.slice(0, 1000)}`);
    }
    logger(`SSE connected with HTTP ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const stopAt = Date.now() + timeoutMs;
    for (;;) {
        const timeRemaining = Math.max(stopAt - Date.now(), 1);
        const { done, value } = await readWithTimeout(reader, timeRemaining, "Timed out waiting for SSE endpoint event");
        if (done) {
            throw new Error("SSE stream ended before endpoint event");
        }
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";
        for (const event of events) {
            const lines = event.split(/\r?\n/);
            const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
            const data = lines
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trim())
                .join("\n");
            if (eventName === "endpoint" && data) {
                return { endpoint: resolveEndpoint(data, sseUrl), reader };
            }
        }
    }
}
async function rpc(endpoint, accessToken, id, method, params, { timeoutMs = 15000, retries = 0, retryBaseMs = 500, logger = () => { }, sessionCookie } = {}) {
    logger(`RPC send ${method}`);
    const response = await fetchWithPolicy(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...requestAuthHeaders(accessToken, sessionCookie)
        },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
        timeoutMs,
        retries,
        retryBaseMs,
        logger
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`RPC ${method} failed with HTTP ${response.status}: ${text}`);
    }
}
async function readRpcResult(reader, expectedId, timeoutMs = 30000) {
    const decoder = new TextDecoder();
    let buffer = "";
    const stopAt = Date.now() + timeoutMs;
    for (;;) {
        const timeRemaining = Math.max(stopAt - Date.now(), 1);
        const { done, value } = await readWithTimeout(reader, timeRemaining, `Timed out waiting for response ${expectedId}`);
        if (done) {
            throw new Error(`SSE stream ended before response ${expectedId}`);
        }
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";
        for (const event of events) {
            const data = event
                .split(/\r?\n/)
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trim())
                .join("\n");
            if (!data) {
                continue;
            }
            const message = JSON.parse(data);
            if (message.id === expectedId) {
                if (message.error) {
                    throw new Error(message.error.message || JSON.stringify(message.error));
                }
                return message.result || {};
            }
        }
    }
}
function normalizeEpochMs(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }
    return parsed < 10_000_000_000 ? parsed * 1000 : parsed;
}
//# sourceMappingURL=runtime-utils.js.map