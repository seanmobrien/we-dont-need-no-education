import type { FetchPolicyOptions } from "./runtime-utils";
import { fetchWithPolicy } from "./runtime-utils";
import { httpStatusError } from "./errors";
import { httpRetryBaseMs, httpRetryCount, httpTimeoutMs, log } from "./config";
import type { AnyRecord, JsonResponse } from "./types";

export async function fetchJsonResponse(url: string, options: FetchPolicyOptions = {}): Promise<JsonResponse> {
  const startedAt = Date.now();
  const response = await fetchWithPolicy(url, {
    ...options,
    timeoutMs: httpTimeoutMs(),
    retries: httpRetryCount(),
    retryBaseMs: httpRetryBaseMs(),
    logger: log
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }
  log("HTTP request completed", {
    url,
    method: options.method || "GET",
    status: response.status,
    durationMs: Date.now() - startedAt
  });
  return { response, body, url };
}

export async function fetchJson(url: string, options: FetchPolicyOptions = {}): Promise<AnyRecord> {
  const { response, body } = await fetchJsonResponse(url, options);
  if (!response.ok) {
    throw httpStatusError(String(body.error || body.error_description || `HTTP ${response.status}`), response.status);
  }
  return body;
}