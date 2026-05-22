import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set(["ABORT_ERR", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"]);

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

type RetriableError = Error & {
  code?: string;
  cause?: { code?: string };
};

type SessionResult = {
  response?: Pick<Response, "ok">;
  body?: { status?: string };
};

export type SseConnection = {
  endpoint: string;
  reader: RpcReader;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseNumber(value: unknown, fallback: number, minimum = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(parsed, minimum);
}

export function tokenExpiresAt(token: Token | AppSession, fallbackMs = 300000): number {
  const explicit = normalizeEpochMs(token.expires_at_ms ?? token.expires_at);
  if (explicit) {
    return explicit;
  }
  if (token.expires_in) {
    return Date.now() + Number(token.expires_in) * 1000;
  }
  return Date.now() + fallbackMs;
}

export function isUsableCachedToken(token?: Token, skewMs = 60000): boolean {
  if (!token?.access_token) {
    return false;
  }
  return tokenExpiresAt(token, 0) - skewMs > Date.now();
}

export function isUsableCachedAppSession(token?: Token, skewMs = 60000): boolean {
  const session = token?.app_session;
  if (!session?.token || !session?.cookie_name) {
    return false;
  }
  return tokenExpiresAt(session, 0) - skewMs > Date.now();
}

export function appSessionCookieHeader(session?: AppSession): string | undefined {
  if (!session?.token || !session?.cookie_name) {
    return undefined;
  }
  return `${session.cookie_name}=${session.token}`;
}

export async function readCachedTokenFile(
  tokenCachePath: string,
  { skewMs = 60000, logger = () => {} }: { skewMs?: number; logger?: Logger } = {}
): Promise<Token | undefined> {
  try {
    const cached = JSON.parse(await readFile(tokenCachePath, "utf8")) as Token;
    if (isUsableCachedToken(cached, skewMs)) {
      logger(`using cached access token from ${tokenCachePath}`);
      return cached;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function writeCachedTokenFile(
  tokenCachePath: string,
  token: Token,
  { fallbackMs = 300000, logger = () => {} }: { fallbackMs?: number; logger?: Logger } = {}
): Promise<Token> {
  const cached = {
    ...token,
    expires_at: tokenExpiresAt(token, fallbackMs),
    expires_at_iso: new Date(tokenExpiresAt(token, fallbackMs)).toISOString(),
    cached_at: Date.now()
  };
  await mkdir(dirname(tokenCachePath), { recursive: true });
  await writeFile(tokenCachePath, JSON.stringify(cached, null, 2), { mode: 0o600 });
  logger(`cached access token at ${tokenCachePath}`);
  return cached;
}

export function backoffDelayMs(attempt: number, retryBaseMs: number): number {
  return retryBaseMs * (2 ** attempt);
}

export function shouldRetryStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

export function shouldRetryError(error: unknown): boolean {
  const retriable = error as RetriableError | undefined;
  const code = retriable?.code || retriable?.cause?.code;
  if (code && RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }
  return String(retriable?.message || "").toLowerCase().includes("fetch failed");
}

function timeoutError(timeoutMs: number): RetriableError {
  const error = new Error(`Request timed out after ${timeoutMs}ms`) as RetriableError;
  error.code = "ABORT_ERR";
  return error;
}

export async function fetchWithPolicy(url: string | URL, options: FetchPolicyOptions = {}): Promise<Response> {
  const {
    timeoutMs = 15000,
    retries = 0,
    retryBaseMs = 500,
    logger = () => {},
    ...fetchOptions
  } = options;

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
      if (response.ok || attempt >= retries || !shouldRetryStatus(response.status)) {
        return response;
      }

      await response.body?.cancel?.().catch(() => {});
      const waitMs = backoffDelayMs(attempt, retryBaseMs);
      logger(`retrying ${url} after HTTP ${response.status} in ${waitMs}ms`);
      await sleep(waitMs);
    } catch (error) {
      const caught = error as Error;
      const normalizedError = caught?.name === "AbortError" ? timeoutError(timeoutMs) : caught;
      if (attempt >= retries || !shouldRetryError(normalizedError)) {
        throw normalizedError;
      }

      const waitMs = backoffDelayMs(attempt, retryBaseMs);
      logger(`retrying ${url} after ${normalizedError.message || "request error"} in ${waitMs}ms`);
      await sleep(waitMs);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

function isLoopbackHost(hostname?: string): boolean {
  const normalized = String(hostname || "").replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function warnIfInsecureUrl(urlString: string, logger: Logger = () => {}, label = "URL"): void {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol === "http:" && !isLoopbackHost(parsed.hostname)) {
      logger(`${label} is using insecure HTTP: ${urlString}`);
    }
  } catch {
    return;
  }
}

export function isAuthenticatedSessionResult(sessionResult?: SessionResult): boolean {
  return Boolean(sessionResult?.response?.ok && sessionResult?.body?.status === "authenticated");
}

export function resolveEndpoint(endpoint: string, baseUrl: string): string {
  return new URL(endpoint, baseUrl).toString();
}

function requestAuthHeaders(accessToken?: string, sessionCookie?: string): HeadersInit {
  if (sessionCookie) {
    return { Cookie: sessionCookie };
  }
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function readWithTimeout(
  reader: RpcReader,
  timeoutMs: number,
  errorMessage: string
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function connectSse({
  sseUrl,
  accessToken,
  sessionCookie,
  timeoutMs = 30000,
  httpTimeoutMs = 15000,
  httpRetries = 1,
  httpRetryBaseMs = 500,
  logger = () => {}
}: {
  sseUrl: string;
  accessToken?: string;
  sessionCookie?: string;
  timeoutMs?: number;
  httpTimeoutMs?: number;
  httpRetries?: number;
  httpRetryBaseMs?: number;
  logger?: Logger;
}): Promise<SseConnection> {
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

  while (true) {
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

export async function rpc(
  endpoint: string,
  accessToken: string | undefined,
  id: string | number,
  method: string,
  params: JsonRpcParams,
  {
  timeoutMs = 15000,
  retries = 0,
  retryBaseMs = 500,
  logger = () => {},
  sessionCookie
  }: {
    timeoutMs?: number;
    retries?: number;
    retryBaseMs?: number;
    logger?: Logger;
    sessionCookie?: string;
  } = {}
): Promise<void> {
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

export async function readRpcResult(
  reader: RpcReader,
  expectedId: string | number,
  timeoutMs = 30000
): Promise<Record<string, unknown>> {
  const decoder = new TextDecoder();
  let buffer = "";
  const stopAt = Date.now() + timeoutMs;

  while (true) {
    const timeRemaining = Math.max(stopAt - Date.now(), 1);
    const { done, value } = await readWithTimeout(
      reader,
      timeRemaining,
      `Timed out waiting for response ${expectedId}`
    );
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

      const message = JSON.parse(data) as {
        id?: string | number;
        error?: { message?: string };
        result?: Record<string, unknown>;
      };
      if (message.id === expectedId) {
        if (message.error) {
          throw new Error(message.error.message || JSON.stringify(message.error));
        }
        return message.result || {};
      }
    }
  }
}

function normalizeEpochMs(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed < 10_000_000_000 ? parsed * 1000 : parsed;
}
