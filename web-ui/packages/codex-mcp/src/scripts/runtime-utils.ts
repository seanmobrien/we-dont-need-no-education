import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set(["ABORT_ERR", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"]);

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseNumber(value: any, fallback: number, minimum = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(parsed, minimum);
}

export function tokenExpiresAt(token: any, fallbackMs = 300000) {
  if (token.expires_at) {
    return Number(token.expires_at);
  }
  if (token.expires_in) {
    return Date.now() + Number(token.expires_in) * 1000;
  }
  return Date.now() + fallbackMs;
}

export function isUsableCachedToken(token: any, skewMs = 60000) {
  if (!token?.access_token) {
    return false;
  }
  return Number(token.expires_at || 0) - skewMs > Date.now();
}

export async function readCachedTokenFile(tokenCachePath: string, { skewMs = 60000, logger = () => {} } = {}) {
  try {
    const cached = JSON.parse(await readFile(tokenCachePath, "utf8"));
    if (isUsableCachedToken(cached, skewMs)) {
      logger(); // Optionally log elsewhere if needed
      return cached;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function writeCachedTokenFile(tokenCachePath: string, token: any, { fallbackMs = 300000, logger = () => {} } = {}) {
  const cached = {
    ...token,
    expires_at: tokenExpiresAt(token, fallbackMs),
    cached_at: Date.now()
  };
  await mkdir(dirname(tokenCachePath), { recursive: true });
  await writeFile(tokenCachePath, JSON.stringify(cached, null, 2), { mode: 0o600 });
  logger(); // Optionally log elsewhere if needed
  return cached;
}

export function backoffDelayMs(attempt: number, retryBaseMs: number) {
  return retryBaseMs * (2 ** attempt);
}

export function shouldRetryStatus(status: number) {
  return RETRYABLE_STATUS_CODES.has(status);
}

export function shouldRetryError(error: any) {
  const code = error?.code || error?.cause?.code;
  if (RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }
  return String(error?.message || "").toLowerCase().includes("fetch failed");
}

function timeoutError(timeoutMs: number) {
  const error = new Error(`Request timed out after ${timeoutMs}ms`);
  (error as any).code = "ABORT_ERR";
  return error;
}
