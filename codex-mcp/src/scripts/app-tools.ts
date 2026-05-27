import { acquireAppSession, acquireToken } from "./auth";
import {
  embeddingCacheMaxEntries,
  embeddingCacheTtlMs,
  httpRetryBaseMs,
  httpRetryCount,
  httpTimeoutMs,
  log,
  required,
} from "./config";
import { httpStatusError, httpStatusFromError, isHttpBadRequest } from "./errors";
import { fetchJsonResponse } from "./http";
import {
  aiEmbedEndpointPath,
  aiEmbedEndpointUrl,
  documentUnitEmbeddingsEndpointPath,
  documentUnitEmbeddingsEndpointUrl,
  documentUnitEndpointUrl,
  memoryEndpointUrl,
} from "./urls";
import {
  createCachedQueryVectorGenerator,
  createQueryVectorCache,
  type QueryVectorFetcher,
} from "./vector-params";
import { appSessionCookieHeader, fetchWithPolicy } from "./runtime-utils";
import type { AnyRecord, CachedToken, EmbeddingAction, ToolArgs } from "./types";

export type RefreshTokenCallback = (reason: string) => Promise<CachedToken>;
export type RemoteRequestCallback = (method: string, params?: ToolArgs) => Promise<AnyRecord>;

const queryVectorCache = createQueryVectorCache(embeddingCacheMaxEntries(), embeddingCacheTtlMs());

export function clearAppToolCaches(): void {
  queryVectorCache.clear();
}

function requiredToolArgument(args: ToolArgs | undefined, name: string): any {
  const value = args?.[name];
  if (value === undefined || value === null || value === "") {
    throw new Error(`${name} is required.`);
  }
  return value;
}

async function memoryApiRequest(method: string, url: string, body: unknown, refreshToken: RefreshTokenCallback): Promise<AnyRecord> {
  const token = await acquireToken();
  try {
    return await memoryApiRequestWithToken(token, method, url, body);
  } catch (error) {
    if (!isHttpBadRequest(error)) {
      throw error;
    }
    const freshToken = await refreshToken(`Memory API ${method} ${url} returned HTTP 400`);
    return memoryApiRequestWithToken(freshToken, method, url, body);
  }
}

async function memoryApiRequestWithToken(
  token: CachedToken,
  method: string,
  url: string,
  body?: unknown
): Promise<AnyRecord> {
  const appSession = await acquireAppSession(token);
  const sessionCookie = appSessionCookieHeader(appSession);
  if (!sessionCookie) {
    throw new Error("Wrapped app session did not include a cookie header.");
  }
  const responseResult = await fetchJsonResponse(url, {
    method,
    headers: {
      Accept: "application/json",
      Cookie: sessionCookie,
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!responseResult.response.ok) {
    const detail = responseResult.body?.message || responseResult.body?.error || `HTTP ${responseResult.response.status}`;
    throw httpStatusError(`Memory API ${method} ${url} failed: ${detail}`, responseResult.response.status);
  }
  return responseResult.body;
}

async function appSessionJsonRequest(method: string, url: string, body: unknown, refreshToken: RefreshTokenCallback): Promise<AnyRecord> {
  const token = await acquireToken();
  try {
    return await appSessionJsonRequestWithToken(token, method, url, body);
  } catch (error) {
    if (!isHttpBadRequest(error)) {
      throw error;
    }
    const freshToken = await refreshToken(`App API ${method} ${url} returned HTTP 400`);
    return appSessionJsonRequestWithToken(freshToken, method, url, body);
  }
}

async function appSessionJsonRequestWithToken(
  token: CachedToken,
  method: string,
  url: string,
  body?: unknown
): Promise<AnyRecord> {
  const appSession = await acquireAppSession(token);
  const sessionCookie = appSessionCookieHeader(appSession);
  if (!sessionCookie) {
    throw new Error("Wrapped app session did not include a cookie header.");
  }
  const responseResult = await fetchJsonResponse(url, {
    method,
    headers: {
      Accept: "application/json",
      Cookie: sessionCookie,
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!responseResult.response.ok) {
    const detail = responseResult.body?.message || responseResult.body?.error || `HTTP ${responseResult.response.status}`;
    throw httpStatusError(`App API ${method} ${url} failed: ${detail}`, responseResult.response.status);
  }
  return responseResult.body;
}

function appApiEndpointUrl(relativeUrl: string): string {
  const trimmed = relativeUrl.trim();
  if (!trimmed) {
    throw new Error("url is required.");
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
    throw new Error("url must be relative to the Compliance Theater /api root.");
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");
  const apiRelative = withoutLeadingSlash.replace(/^api(?:\/|$)/i, "");
  const server = new URL(required("SERVER_URL"));
  const apiRoot = new URL("/api/", server.origin);
  const target = new URL(apiRelative, apiRoot);
  if (target.origin !== apiRoot.origin || !target.pathname.startsWith("/api/")) {
    throw new Error("url must resolve inside the Compliance Theater /api root.");
  }
  return target.toString();
}

function normalizeHttpMethod(value: unknown): string {
  const method = String(value || "GET").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_-]*$/.test(method)) {
    throw new Error("method must be a valid HTTP method token.");
  }
  return method;
}

function hasToolData(args: ToolArgs): boolean {
  return Object.prototype.hasOwnProperty.call(args, "data") && args.data !== undefined;
}

async function appSessionApiResponse(method: string, url: string, body: unknown, refreshToken: RefreshTokenCallback): Promise<AnyRecord> {
  const token = await acquireToken();
  const first = await appSessionApiResponseWithToken(token, method, url, body);
  if (first.status !== 400) {
    return first;
  }
  const freshToken = await refreshToken(`App API ${method} ${url} returned HTTP 400`);
  return appSessionApiResponseWithToken(freshToken, method, url, body);
}

async function appSessionApiResponseWithToken(
  token: CachedToken,
  method: string,
  url: string,
  body?: unknown
): Promise<AnyRecord> {
  const appSession = await acquireAppSession(token);
  const sessionCookie = appSessionCookieHeader(appSession);
  if (!sessionCookie) {
    throw new Error("Wrapped app session did not include a cookie header.");
  }

  const startedAt = Date.now();
  const response = await fetchWithPolicy(url, {
    method,
    headers: {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      Cookie: sessionCookie,
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    timeoutMs: httpTimeoutMs(),
    retries: httpRetryCount(),
    retryBaseMs: httpRetryBaseMs(),
    logger: log
  });
  const text = await response.text();
  let parsedBody: unknown = null;
  let parsedJson = false;
  try {
    parsedBody = text ? JSON.parse(text) : null;
    parsedJson = text.trim().length > 0;
  } catch {
    parsedBody = null;
  }
  log("App API call completed", {
    url,
    method,
    status: response.status,
    durationMs: Date.now() - startedAt
  });
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    method,
    url,
    body: parsedBody,
    text: parsedJson ? null : text
  };
}

export async function callApiTool(args: ToolArgs = {}, refreshToken: RefreshTokenCallback): Promise<AnyRecord> {
  const url = appApiEndpointUrl(String(requiredToolArgument(args, "url")));
  const method = normalizeHttpMethod(args.method);
  const includesBody = hasToolData(args);
  if (includesBody && (method === "GET" || method === "HEAD")) {
    throw new Error("data cannot be sent with GET or HEAD. Put query parameters in the url, or use POST/PUT/PATCH.");
  }
  return appSessionApiResponse(method, url, includesBody ? args.data : undefined, refreshToken);
}

export async function readCaseFileTool(args: ToolArgs = {}, refreshToken: RefreshTokenCallback): Promise<AnyRecord> {
  const caseFileId = args.caseFileId ?? args.case_file_id ?? args.id;
  if (caseFileId === undefined || caseFileId === null || caseFileId === "") {
    throw new Error("caseFileId is required.");
  }
  return appSessionJsonRequest("GET", documentUnitEndpointUrl(caseFileId), undefined, refreshToken);
}

function caseFileIdsFromArgs(args: ToolArgs): Array<string | number> {
  const ids: Array<string | number> = [];
  if (args.caseFileId !== undefined && args.caseFileId !== null && args.caseFileId !== "") {
    ids.push(args.caseFileId);
  }
  if (args.id !== undefined && args.id !== null && args.id !== "") {
    ids.push(args.id);
  }
  if (Array.isArray(args.ids)) {
    ids.push(...args.ids.filter((id) => id !== undefined && id !== null && id !== ""));
  }
  if (Array.isArray(args.requests)) {
    ids.push(...args.requests
      .map((request) => request?.caseFileId)
      .filter((id) => id !== undefined && id !== null && id !== ""));
  }
  return ids;
}

function goalsRequestsFromArgs(args: ToolArgs): AnyRecord[] {
  if (Array.isArray(args.requests) && args.requests.length > 0) {
    return args.requests;
  }
  const ids = caseFileIdsFromArgs(args);
  return ids.map((caseFileId) => ({ caseFileId }));
}

export async function getCaseFileTool(
  args: ToolArgs = {},
  remoteRequest: RemoteRequestCallback,
  refreshToken: RefreshTokenCallback
): Promise<AnyRecord> {
  const mode = args.mode;
  if (mode !== "direct" && mode !== "goals") {
    throw new Error("mode is required and must be one of: direct, goals.");
  }
  if (mode === "direct") {
    if (args.goals !== undefined || args.verbatim_fidelity !== undefined) {
      throw new Error("direct mode does not accept goals or verbatim_fidelity. Use goals mode for preprocessing.");
    }
    const ids = caseFileIdsFromArgs(args);
    if (ids.length === 0) {
      throw new Error("direct mode requires caseFileId, id, ids, or requests.");
    }
    if (ids.length > 3) {
      throw new Error("direct mode supports at most 3 case-file IDs. Use goals mode for larger batches.");
    }
    return {
      mode,
      items: await Promise.all(ids.map(async (caseFileId) => ({
        caseFileId,
        result: await readCaseFileTool({ caseFileId }, refreshToken)
      })))
    };
  }

  const requests = goalsRequestsFromArgs(args);
  if (requests.length === 0) {
    throw new Error("goals mode requires requests, ids, caseFileId, or id.");
  }
  return {
    mode,
    result: await remoteRequest("tools/call", {
      name: "getMultipleCaseFileDocuments",
      arguments: {
        requests,
        ...(args.goals === undefined ? {} : { goals: args.goals }),
        ...(args.verbatim_fidelity === undefined ? {} : { verbatim_fidelity: args.verbatim_fidelity })
      }
    })
  };
}

export async function amendCaseFileTool(args: ToolArgs = {}, remoteRequest: RemoteRequestCallback): Promise<AnyRecord> {
  return remoteRequest("tools/call", {
    name: "amendCaseFileDocument",
    arguments: args
  });
}

function requiredModelSize(args: ToolArgs): "large" | "small" {
  const modelSize = args.modelSize ?? args.model_size ?? args.size;
  if (modelSize !== "large" && modelSize !== "small") {
    throw new Error("modelSize is required and must be one of: large, small.");
  }
  return modelSize;
}

function optionalModelSize(args: ToolArgs): "large" | "small" {
  const modelSize = args.modelSize ?? args.model_size ?? args.size ?? "large";
  if (modelSize !== "large" && modelSize !== "small") {
    throw new Error("modelSize must be one of: large, small.");
  }
  return modelSize;
}

function isMissingEmbeddingResult(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === "object") {
    const record = value as AnyRecord;
    if (record.isError === true && !record.value && !record.items && !record.result) {
      return true;
    }
    if ("value" in record) {
      return isMissingEmbeddingResult(record.value);
    }
    if ("result" in record) {
      return isMissingEmbeddingResult(record.result);
    }
    if ("items" in record) {
      return isMissingEmbeddingResult(record.items);
    }
    if ("embeddings" in record && isMissingEmbeddingResult(record.embeddings)) {
      return true;
    }
    const meaningfulKeys = Object.keys(record).filter((key) => record[key] !== undefined && record[key] !== null);
    if (meaningfulKeys.length === 0) {
      return true;
    }
    if (meaningfulKeys.length === 1 && meaningfulKeys[0] === "isError" && record.isError === false) {
      return true;
    }
  }
  return false;
}

async function readEmbeddingsOrNull(
  caseFileId: string | number,
  modelSize: "large" | "small",
  index: string | number | undefined,
  refreshToken: RefreshTokenCallback
) {
  try {
    const result = await appSessionJsonRequest("GET", documentUnitEmbeddingsEndpointUrl(caseFileId, modelSize, index), undefined, refreshToken);
    return isMissingEmbeddingResult(result) ? null : result;
  } catch (error) {
    const status = httpStatusFromError(error);
    if (status === 404 || status === 204) {
      return null;
    }
    throw error;
  }
}

async function generateEmbeddings(caseFileId: string | number, modelSize: "large" | "small", refreshToken: RefreshTokenCallback) {
  return appSessionJsonRequest("PUT", documentUnitEmbeddingsEndpointUrl(caseFileId, modelSize), undefined, refreshToken);
}

export const generateQueryVectorsForApp = createCachedQueryVectorGenerator(
  (text, modelSize) => {
    throw new Error(`generateQueryVectorsForApp is not configured: ${JSON.stringify({ textLength: text.length, modelSize })}`);
  },
  queryVectorCache,
  log
);

export function createGenerateQueryVectors(refreshToken: RefreshTokenCallback): QueryVectorFetcher {
  return createCachedQueryVectorGenerator(
    (text, modelSize) => appSessionJsonRequest("POST", aiEmbedEndpointUrl(), {
      text,
      size: modelSize
    }, refreshToken),
    queryVectorCache,
    log
  );
}

function embeddingAction(args: ToolArgs): EmbeddingAction {
  const rawAction = args.action;
  const normalized = typeof rawAction === "string" ? rawAction.replace(/_/g, "-") : "";
  if (
    normalized === "read" ||
    normalized === "embed" ||
    normalized === "embed-if-missing" ||
    normalized === "query-vectors"
  ) {
    return normalized;
  }
  throw new Error("action is required and must be one of: read, embed, embed-if-missing, query-vectors.");
}

export async function manageCaseFileEmbeddingsTool(args: ToolArgs = {}, refreshToken: RefreshTokenCallback): Promise<AnyRecord> {
  const action = embeddingAction(args);
  const generateQueryVectors = createGenerateQueryVectors(refreshToken);
  if (action === "query-vectors") {
    const text = args.text ?? args.query ?? args.queryText ?? args.query_text;
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("text is required for query-vectors.");
    }
    const modelSize = optionalModelSize(args);
    return {
      action,
      caseFileId: null,
      modelSize,
      index: null,
      endpoint: aiEmbedEndpointPath(),
      generated: true,
      result: await generateQueryVectors(text, modelSize)
    };
  }

  const caseFileId = args.caseFileId ?? args.case_file_id ?? args.documentId ?? args.docId ?? args.id;
  if (caseFileId === undefined || caseFileId === null || caseFileId === "") {
    throw new Error("caseFileId is required.");
  }
  const modelSize = requiredModelSize(args);
  const index = args.index;
  if (index !== undefined && index !== null && index !== "" && action !== "read" && action !== "embed-if-missing") {
    throw new Error("index can only be used with action read or embed-if-missing.");
  }

  if (action === "read") {
    return {
      action,
      caseFileId,
      modelSize,
      index: index ?? null,
      endpoint: documentUnitEmbeddingsEndpointPath(caseFileId, index),
      generated: false,
      result: await readEmbeddingsOrNull(caseFileId, modelSize, index, refreshToken)
    };
  }

  if (action === "embed") {
    return {
      action,
      caseFileId,
      modelSize,
      index: null,
      endpoint: documentUnitEmbeddingsEndpointPath(caseFileId),
      generated: true,
      result: await generateEmbeddings(caseFileId, modelSize, refreshToken)
    };
  }

  const existing = await readEmbeddingsOrNull(caseFileId, modelSize, index, refreshToken);
  if (existing !== null) {
    return {
      action,
      caseFileId,
      modelSize,
      index: index ?? null,
      endpoint: documentUnitEmbeddingsEndpointPath(caseFileId, index),
      generated: false,
      result: existing
    };
  }

  return {
    action,
    caseFileId,
    modelSize,
    index: null,
    endpoint: documentUnitEmbeddingsEndpointPath(caseFileId),
    generated: true,
    result: await generateEmbeddings(caseFileId, modelSize, refreshToken)
  };
}

export async function callMemoryTool(name: string, args: ToolArgs = {}, refreshToken: RefreshTokenCallback): Promise<AnyRecord> {
  switch (name) {
    case "list":
      return memoryApiRequest("GET", memoryEndpointUrl("memories/", {
        app_id: args.app_id,
        from_date: args.from_date,
        to_date: args.to_date,
        categories: args.categories,
        search_query: args.search_query,
        sort_column: args.sort_column,
        sort_direction: args.sort_direction,
        page: args.page,
        size: args.size
      }), undefined, refreshToken);
    case "insert":
      return memoryApiRequest("POST", memoryEndpointUrl("memories/"), {
        text: requiredToolArgument(args, "text"),
        ...(args.metadata === undefined ? {} : { metadata: args.metadata }),
        ...(args.infer === undefined ? {} : { infer: args.infer }),
        ...(args.app === undefined ? {} : { app: args.app })
      }, refreshToken);
    case "categories":
      return memoryApiRequest("GET", memoryEndpointUrl("memories/categories"), undefined, refreshToken);
    case "get":
      return memoryApiRequest(
        "GET",
        memoryEndpointUrl(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}`),
        undefined,
        refreshToken
      );
    case "update":
      return memoryApiRequest(
        "PUT",
        memoryEndpointUrl(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}`),
        { memory_content: requiredToolArgument(args, "memory_content") },
        refreshToken
      );
    case "search":
      return memoryApiRequest("POST", memoryEndpointUrl("memories/search"), {
        query: requiredToolArgument(args, "query"),
        ...(args.numberOfHits === undefined ? {} : { numberOfHits: args.numberOfHits }),
        ...(args.page === undefined ? {} : { page: args.page }),
        ...(args.filters === undefined ? {} : { filters: args.filters })
      }, refreshToken);
    case "related":
      return memoryApiRequest(
        "GET",
        memoryEndpointUrl(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}/related`, {
          page: args.page,
          size: args.size
        }),
        undefined,
        refreshToken
      );
    default:
      throw new Error(`Unknown memory tool ${name}`);
  }
}