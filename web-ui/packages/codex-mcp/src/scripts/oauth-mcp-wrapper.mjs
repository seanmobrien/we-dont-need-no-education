#!/usr/bin/env node
import { randomInt } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import {
  appSessionCookieHeader,
  connectSse,
  fetchWithPolicy,
  isAuthenticatedSessionResult,
  isUsableCachedAppSession,
  parseNumber,
  readCachedTokenFile,
  readRpcResult,
  rpc,
  sleep,
  tokenExpiresAt,
  warnIfInsecureUrl,
  writeCachedTokenFile
} from "./runtime-utils.mjs";

const PREFIX = "MCP_COMPLIANCE_THEATER_RESOURCE_";
const env = process.env;
let registeredClient;
let logWriteFailed = false;
let remote;
let remoteQueue = Promise.resolve();

const exposedRemoteToolNames = new Set([
  "searchPolicyStore",
  "searchCaseFile",
  "getMultipleCaseFileDocuments",
  "getCaseFileDocumentIndex",
  "amendCaseFileDocument",
  "sequentialthinking",
  "createTodo",
  "getTodos",
  "updateTodo",
  "toggleTodo",
  "getCaseWorkspace",
  "readWorkspaceFile",
  "appendWorkspaceTask",
  "updateWorkspaceTaskStatus",
  "updateWorkspaceTaskDetails",
  "upsertWorkspaceDocumentSummary",
  "addOpenQuestion",
  "updateOpenQuestionStatus",
  "appendWorkspaceSessionLog",
  "compactWorkspace"
]);

const memoryTools = [
  {
    name: "listMemories",
    description: "List memories for the authenticated Compliance Theater app session.",
    inputSchema: {
      type: "object",
      properties: {
        app_id: { type: "string", description: "Optional memory app UUID filter." },
        from_date: { type: "integer", description: "Only return memories created after this Unix timestamp." },
        to_date: { type: "integer", description: "Only return memories created before this Unix timestamp." },
        categories: { type: "string", description: "Optional category filter." },
        search_query: { type: "string", description: "Optional search text filter." },
        sort_column: { type: "string", description: "Sort by memory, categories, app_name, or created_at." },
        sort_direction: { type: "string", enum: ["asc", "desc"], description: "Sort order." },
        page: { type: "integer", minimum: 1, default: 1, description: "Page number." },
        size: { type: "integer", minimum: 1, maximum: 100, default: 50, description: "Page size." }
      },
      additionalProperties: false
    }
  },
  {
    name: "createMemory",
    description: "Create a memory for the authenticated Compliance Theater app session.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Memory text to store." },
        metadata: { type: "object", additionalProperties: true, description: "Optional memory metadata." },
        infer: { type: "boolean", default: true, description: "Whether the memory service should infer memories." },
        app: { type: "string", default: "openmemory", description: "Memory app name." }
      },
      required: ["text"],
      additionalProperties: false
    }
  },
  {
    name: "getMemoryCategories",
    description: "Get the available memory categories for the authenticated Compliance Theater app session.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "getMemory",
    description: "Get a memory by its ID.",
    inputSchema: {
      type: "object",
      properties: { memory_id: { type: "string", description: "Memory UUID." } },
      required: ["memory_id"],
      additionalProperties: false
    }
  },
  {
    name: "updateMemory",
    description: "Update a memory by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        memory_id: { type: "string", description: "Memory UUID." },
        memory_content: { type: "string", description: "Replacement memory content." }
      },
      required: ["memory_id", "memory_content"],
      additionalProperties: false
    }
  },
  {
    name: "searchMemories",
    description: "Search memories for the authenticated Compliance Theater app session.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Memory search query." },
        numberOfHits: { type: "integer", minimum: 1, default: 10, description: "Maximum search hits." },
        page: { type: "integer", minimum: 1, default: 1, description: "Result page." },
        filters: { type: "object", additionalProperties: true, description: "Optional memory search filters." }
      },
      required: ["query"],
      additionalProperties: false
    }
  },
  {
    name: "getRelatedMemories",
    description: "List memories related to a source memory ID.",
    inputSchema: {
      type: "object",
      properties: {
        memory_id: { type: "string", description: "Memory UUID." },
        page: { type: "integer", minimum: 1, default: 1, description: "Page number." },
        size: { type: "integer", minimum: 1, maximum: 100, default: 50, description: "Page size." }
      },
      required: ["memory_id"],
      additionalProperties: false
    }
  }
];

const helperTools = [
  {
    name: "mcp_resource_auth_list_abilities",
    description: "List tools exposed by Compliance Theater 2000, plus resource and resource template counts.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "mcp_resource_auth_list_resources",
    description: "Return a directory-style listing of resources and resource templates exposed by Compliance Theater 2000.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "mcp_resource_auth_manage_auth",
    description: "Manage plugin authentication state. Supports login, status, and clear-cache actions.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["status", "clear-cache", "login"],
          description: "Authentication action to run"
        }
      },
      required: ["action"],
      additionalProperties: false
    }
  },
  ...memoryTools
];

function key(name) {
  return `${PREFIX}${name}`;
}

function resolveValue(value) {
  const fallback = /^\$\{[A-Z0-9_]+:-(.*)\}$/.exec(value || "");
  if (fallback) {
    return fallback[1];
  }
  const passthrough = /^\$\{([A-Z0-9_]+)\}$/.exec(value || "");
  if (passthrough) {
    const resolved = env[passthrough[1]];
    return resolved && resolved !== value ? resolved : undefined;
  }
  return value;
}

function optional(name) {
  const value = resolveValue(env[key(name)]);
  if (!value || value.startsWith("[TODO:")) {
    return undefined;
  }
  return value;
}

function required(name) {
  const value = optional(name);
  if (!value) {
    throw new Error(`Missing required environment variable ${key(name)}`);
  }
  return value;
}

function logFilePath() {
  return optional("LOG_FILE") ||
    join(homedir(), ".codex", "mcp-resource-auth", "compliance-theater-wrapper.log");
}

function redact(value) {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([name, item]) => [
      name,
      /token|secret|password|authorization|credential/i.test(name) ? "[redacted]" : redact(item)
    ])
  );
}

function log(message, details) {
  console.error(`[mcp-resource-auth] ${message}`);
  const payload = {
    timestamp: new Date().toISOString(),
    pid: process.pid,
    message,
    ...(details ? { details: redact(details) } : {})
  };

  const path = logFilePath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (error) {
    if (!logWriteFailed) {
      logWriteFailed = true;
      console.error(`[mcp-resource-auth] could not write log file ${path}: ${error.message}`);
    }
  }
}

function cachePath() {
  return optional("TOKEN_CACHE_PATH") ||
    join(homedir(), ".codex", "mcp-resource-auth", "compliance-theater-token-cache.json");
}

function tokenSkewMs() {
  return parseNumber(optional("TOKEN_EXPIRY_SKEW_SECONDS"), 60, 0) * 1000;
}

function httpTimeoutMs() {
  return parseNumber(optional("HTTP_TIMEOUT_MS"), 360000, 1000);
}

function httpRetryCount() {
  return parseNumber(optional("HTTP_RETRY_COUNT"), 2, 0);
}

function httpRetryBaseMs() {
  return parseNumber(optional("HTTP_RETRY_BASE_MS"), 500, 0);
}

function proxyRequestTimeoutMs() {
  return parseNumber(optional("PROXY_REQUEST_TIMEOUT_MS"), 360000, 1000);
}

async function readCachedToken() {
  return readCachedTokenFile(cachePath(), {
    skewMs: tokenSkewMs(),
    logger: log
  });
}

async function writeCachedToken(token) {
  if (optional("DISABLE_TOKEN_CACHE") === "1") {
    return;
  }
  await writeCachedTokenFile(cachePath(), token, { logger: log });
}

function normalizeIssuer(value) {
  return value.replace(/\/+$/, "");
}

function metadataCandidates() {
  const explicit = optional("AUTH_METADATA_URL");
  if (explicit) {
    warnIfInsecureUrl(explicit, log, "OAuth metadata URL");
    return [explicit];
  }

  const issuer = normalizeIssuer(required("AUTH_ISSUER"));
  warnIfInsecureUrl(issuer, log, "OAuth issuer");
  const url = new URL(issuer);
  const issuerPath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return [
    `${url.origin}/.well-known/oauth-authorization-server${issuerPath}`,
    `${issuer}/.well-known/oauth-authorization-server`
  ];
}

async function fetchJsonResponse(url, options = {}) {
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

async function fetchJson(url, options = {}) {
  const { response, body } = await fetchJsonResponse(url, options);
  if (!response.ok) {
    throw new Error(String(body.error || body.error_description || `HTTP ${response.status}`));
  }
  return body;
}

async function discoverMetadata() {
  const errors = [];
  for (const url of metadataCandidates()) {
    try {
      const metadata = await fetchJson(url);
      if (!metadata.issuer || !metadata.token_endpoint) {
        throw new Error("metadata is missing issuer or token_endpoint");
      }
      log(`discovered OAuth metadata from ${url}`);
      return metadata;
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }
  throw new Error(`Unable to discover OAuth metadata. Tried: ${errors.join("; ")}`);
}

function hasGrant(metadata, grant) {
  const grants = metadata.grant_types_supported;
  return Array.isArray(grants) ? grants.includes(grant) : grant === "authorization_code";
}

function tokenAuthHeaders(metadata) {
  const clientId = optional("CLIENT_ID");
  const clientSecret = optional("CLIENT_SECRET");
  const methods = metadata.token_endpoint_auth_methods_supported || ["client_secret_basic"];
  if (clientId && clientSecret && methods.includes("client_secret_basic")) {
    return { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` };
  }
  return {};
}

function addClientAuth(body, metadata) {
  const clientId = optional("CLIENT_ID") || registeredClient?.client_id;
  const clientSecret = optional("CLIENT_SECRET") || registeredClient?.client_secret;
  const methods = metadata.token_endpoint_auth_methods_supported || ["client_secret_basic"];
  if (clientId && !body.has("client_id")) {
    body.set("client_id", clientId);
  }
  if (clientSecret && methods.includes("client_secret_post")) {
    body.set("client_secret", clientSecret);
  }
}

async function tokenRequest(metadata, body) {
  addClientAuth(body, metadata);
  const token = await fetchJson(metadata.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...tokenAuthHeaders(metadata)
    },
    body
  });
  if (!token.access_token) {
    throw new Error("token endpoint response did not include access_token");
  }
  return token;
}

async function refreshToken(metadata) {
  const refresh = optional("REFRESH_TOKEN");
  if (!refresh) {
    return undefined;
  }
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh });
  const scope = optional("OAUTH_SCOPE");
  if (scope) {
    body.set("scope", scope);
  }
  log("requesting access token with refresh_token grant");
  return tokenRequest(metadata, body);
}

async function clientCredentials(metadata) {
  if (!hasGrant(metadata, "client_credentials") || !optional("CLIENT_ID") || !optional("CLIENT_SECRET")) {
    return undefined;
  }
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const scope = optional("OAUTH_SCOPE");
  if (scope) {
    body.set("scope", scope);
  }
  log("requesting access token with client_credentials grant");
  return tokenRequest(metadata, body);
}

async function passwordGrant(metadata) {
  if (!hasGrant(metadata, "password") || !optional("USERNAME") || !optional("PASSWORD")) {
    return undefined;
  }
  const body = new URLSearchParams({
    grant_type: "password",
    username: optional("USERNAME"),
    password: optional("PASSWORD")
  });
  const scope = optional("OAUTH_SCOPE");
  if (scope) {
    body.set("scope", scope);
  }
  log("requesting access token with password grant");
  return tokenRequest(metadata, body);
}

async function registerClient(metadata) {
  if (optional("CLIENT_ID")) {
    return { client_id: optional("CLIENT_ID"), client_secret: optional("CLIENT_SECRET") };
  }
  if (registeredClient) {
    return registeredClient;
  }
  if (!metadata.registration_endpoint) {
    return undefined;
  }

  const scope = optional("OAUTH_SCOPE");
  registeredClient = await fetchJson(metadata.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Compliance Theater 2000 Codex Plugin",
      grant_types: ["urn:ietf:params:oauth:grant-type:device_code"],
      token_endpoint_auth_method: "none",
      ...(scope ? { scope } : {})
    })
  });
  if (!registeredClient.client_id) {
    throw new Error("dynamic client registration response did not include client_id");
  }
  log("dynamically registered OAuth client");
  return registeredClient;
}

async function deviceAuthorization(metadata) {
  if (!metadata.device_authorization_endpoint) {
    return undefined;
  }

  const oauthClient = await registerClient(metadata);
  if (!oauthClient?.client_id) {
    return undefined;
  }

  const body = new URLSearchParams({ client_id: oauthClient.client_id });
  if (oauthClient.client_secret) {
    body.set("client_secret", oauthClient.client_secret);
  }
  const scope = optional("OAUTH_SCOPE");
  if (scope) {
    body.set("scope", scope);
  }

  const device = await fetchJson(metadata.device_authorization_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const verification = device.verification_uri_complete || device.verification_uri;
  log(`open ${verification}`);
  if (device.user_code) {
    log(`enter code ${device.user_code}`);
  }

  let intervalMs = Math.max(Number(device.interval || 5), 1) * 1000;
  const expiresAt = Date.now() + Math.max(Number(device.expires_in || 600), 60) * 1000;
  const timeout = Number(optional("DEVICE_CODE_TIMEOUT_SECONDS") || "900") * 1000;
  const stopAt = Math.min(expiresAt, Date.now() + timeout);

  while (Date.now() < stopAt) {
    await sleep(intervalMs);
    try {
      return await tokenRequest(
        metadata,
        new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: device.device_code,
          client_id: oauthClient.client_id
        })
      );
    } catch (error) {
      const message = String(error.message || "").toLowerCase();
      if (message.includes("slow_down")) {
        intervalMs += 5000;
        log(`slowing device authorization polling to ${intervalMs}ms`);
      } else if (!message.includes("authorization_pending")) {
        throw error;
      }
    }
  }

  throw new Error("Timed out waiting for device authorization");
}

async function acquireToken() {
  const existing = optional("ACCESS_TOKEN");
  if (existing) {
    log("using preconfigured access token");
    return { access_token: existing };
  }

  const cached = await readCachedToken();
  if (cached) {
    return cached;
  }

  const metadata = await discoverMetadata();
  const token =
    (await refreshToken(metadata)) ||
    (await clientCredentials(metadata)) ||
    (await passwordGrant(metadata)) ||
    (await deviceAuthorization(metadata));

  if (!token) {
    const grants = metadata.grant_types_supported || ["authorization_code"];
    throw new Error(`No supported OAuth flow could be selected. Server grants: ${grants.join(", ")}`);
  }

  const acquired = { ...token, metadata };
  await writeCachedToken(acquired);
  return acquired;
}

function sendToClient(message) {
  log("sending message to client", summarizeMessage(message));
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function errorResponse(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function textToolResult(text) {
  return { content: [{ type: "text", text }] };
}

function jsonToolResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: { result: value }
  };
}

function summarizeMessage(message) {
  if (!message || typeof message !== "object") {
    return { type: typeof message };
  }
  const params = message.params && typeof message.params === "object" ? message.params : {};
  return {
    id: message.id,
    method: message.method,
    hasError: Boolean(message.error),
    errorMessage: message.error?.message,
    toolName: params.name,
    action: params.arguments?.action,
    resultKeys: message.result && typeof message.result === "object" ? Object.keys(message.result) : undefined,
    paramKeys: Object.keys(params)
  };
}

async function connectRemote() {
  if (remote) {
    return remote;
  }

  const token = await acquireToken();
  let appSession;
  let sessionCookie;
  try {
    appSession = await acquireAppSession(token);
    sessionCookie = appSessionCookieHeader(appSession);
  } catch (error) {
    log(`wrapped app session unavailable for MCP transport; falling back to source bearer: ${error.message}`);
  }
  const sseUrl = required("SERVER_URL");
  warnIfInsecureUrl(sseUrl, log, "Target server URL");
  log("connecting remote MCP SSE", { sseUrl });
  remote = await connectSse({
    sseUrl,
    accessToken: token.access_token,
    sessionCookie,
    timeoutMs: proxyRequestTimeoutMs(),
    httpTimeoutMs: httpTimeoutMs(),
    httpRetries: httpRetryCount(),
    httpRetryBaseMs: httpRetryBaseMs(),
    logger: log
  });
  remote.accessToken = token.access_token;
  remote.appSession = appSession;
  remote.sessionCookie = sessionCookie;
  remote.nextId = randomInt(100_000, 999_999);
  await rawRemoteRequest(remote, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "compliance-theater-2000-codex-plugin", version: "0.1.0" }
  });
  await remoteNotification("notifications/initialized");
  log("remote MCP initialized", { endpoint: remote.endpoint });
  return remote;
}

async function remoteNotification(method, params = {}) {
  const connection = remote || await connectRemote();
  await postRemoteJson(connection, { jsonrpc: "2.0", method, params });
}

async function postRemoteJson(connection, message) {
  const response = await fetchWithPolicy(connection.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(connection.sessionCookie
        ? { Cookie: connection.sessionCookie }
        : { Authorization: `Bearer ${connection.accessToken}` })
    },
    body: JSON.stringify(message),
    timeoutMs: httpTimeoutMs(),
    retries: httpRetryCount(),
    retryBaseMs: httpRetryBaseMs(),
    logger: log
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Remote MCP ${message.method} failed with HTTP ${response.status}: ${text.slice(0, 1000)}`);
  }
}

function remoteRequest(method, params = {}) {
  remoteQueue = remoteQueue.then(async () => {
    const connection = remote || await connectRemote();
    return rawRemoteRequest(connection, method, params);
  });
  return remoteQueue;
}

async function rawRemoteRequest(connection, method, params = {}) {
  const id = connection.nextId++;
  log("remote request started", { id, method, paramKeys: Object.keys(params || {}) });
  await rpc(connection.endpoint, connection.accessToken, id, method, params, {
    timeoutMs: httpTimeoutMs(),
    retries: httpRetryCount(),
    retryBaseMs: httpRetryBaseMs(),
    logger: log,
    sessionCookie: connection.sessionCookie
  });
  const result = await readRpcResult(connection.reader, id, proxyRequestTimeoutMs());
  log("remote request completed", {
    id,
    method,
    resultKeys: result && typeof result === "object" ? Object.keys(result) : []
  });
  return result || {};
}

function isUnsupportedMethod(error) {
  return String(error?.message || "").toLowerCase().includes("method not found");
}

async function collectPaginated(method, keyName) {
  const items = [];
  let cursor;
  do {
    let result;
    try {
      result = await remoteRequest(method, cursor ? { cursor } : {});
    } catch (error) {
      if (isUnsupportedMethod(error)) {
        return [];
      }
      throw error;
    }
    items.push(...(result[keyName] || []));
    cursor = result.nextCursor;
  } while (cursor);
  return items;
}

async function listTools() {
  const result = await remoteRequest("tools/list");
  const exposedTools = (result.tools || []).filter((tool) => exposedRemoteToolNames.has(tool.name));
  return [...exposedTools, ...helperTools];
}

async function listResources() {
  return collectPaginated("resources/list", "resources");
}

async function listResourceTemplates() {
  return collectPaginated("resources/templates/list", "resourceTemplates");
}

function formatSchema(schema) {
  return schema ? JSON.stringify(schema) : "{}";
}

function formatAbilities(tools, resources, templates) {
  const lines = ["Tools:"];
  for (const tool of tools) {
    lines.push(`- ${tool.name}: ${tool.description || "No description"}`);
    lines.push(`  inputSchema: ${formatSchema(tool.inputSchema)}`);
  }
  lines.push("");
  lines.push(`Resources: ${resources.length}`);
  lines.push(`Resource templates: ${templates.length}`);
  for (const template of templates) {
    lines.push(`- ${template.uriTemplate}: ${template.name || template.description || "Template"}`);
  }
  return lines.join("\n");
}

function resourcePath(resource) {
  try {
    const parsed = new URL(resource.uri);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return resource.uri;
  }
}

function formatResourceDirectory(resources, templates) {
  const lines = ["Resources:"];
  const sorted = [...resources].sort((a, b) => resourcePath(a).localeCompare(resourcePath(b)));
  if (!sorted.length) {
    lines.push("- No concrete resources exposed.");
  }
  for (const resource of sorted) {
    const name = resource.name ? ` (${resource.name})` : "";
    const mime = resource.mimeType ? ` [${resource.mimeType}]` : "";
    lines.push(`- ${resourcePath(resource)}${name}${mime}`);
    if (resource.description) {
      lines.push(`  ${resource.description}`);
    }
  }
  lines.push("");
  lines.push("Resource templates:");
  if (!templates.length) {
    lines.push("- No resource templates exposed.");
  }
  for (const template of templates) {
    const name = template.name ? ` (${template.name})` : "";
    lines.push(`- ${template.uriTemplate}${name}`);
    if (template.description) {
      lines.push(`  ${template.description}`);
    }
  }
  return lines.join("\n");
}

function sessionEndpointUrl() {
  const explicit = optional("SESSION_STATUS_URL");
  if (explicit) {
    warnIfInsecureUrl(explicit, log, "Session status URL");
    return explicit;
  }
  const parsed = new URL(required("SERVER_URL"));
  parsed.pathname = "/api/auth/session";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function wrapEndpointUrl() {
  const explicit = optional("WRAP_URL");
  if (explicit) {
    warnIfInsecureUrl(explicit, log, "Session wrap URL");
    return explicit;
  }
  const parsed = new URL(required("SERVER_URL"));
  parsed.pathname = "/api/auth/wrap";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function appEndpointUrl(pathname, query = {}) {
  const parsed = new URL(required("SERVER_URL"));
  parsed.pathname = pathname;
  parsed.search = "";
  parsed.hash = "";
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      parsed.searchParams.set(name, String(value));
    }
  }
  return parsed.toString();
}

function memoryEndpointUrl(pathname, query) {
  return appEndpointUrl(`/api/memory/${pathname.replace(/^\/+/, "")}`, query);
}

async function clearCachedToken() {
  if (optional("DISABLE_TOKEN_CACHE") === "1") {
    return "Token cache is disabled by MCP_COMPLIANCE_THEATER_RESOURCE_DISABLE_TOKEN_CACHE=1.";
  }
  try {
    await rm(cachePath());
    return `Removed cached token file: ${cachePath()}`;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return `No cached token file found at: ${cachePath()}`;
    }
    throw error;
  }
}

async function currentAccessToken() {
  const explicit = optional("ACCESS_TOKEN");
  if (explicit) {
    return { token: explicit, source: "env:ACCESS_TOKEN" };
  }
  const cached = await readCachedToken();
  return cached?.access_token ? { token: cached.access_token, source: "cached-token", cached } : undefined;
}

function roleSummary(resourceAccess) {
  if (!resourceAccess || typeof resourceAccess !== "object") {
    return "none";
  }
  const entries = Object.entries(resourceAccess).map(([resourceName, details]) => {
    const roles = Array.isArray(details) ? details : Array.isArray(details?.roles) ? details.roles : [];
    return `${resourceName}: ${roles.join(", ") || "(no roles)"}`;
  });
  return entries.length ? entries.join("\n") : "none";
}

async function fetchSessionForAppSession(appSession) {
  const url = sessionEndpointUrl();
  const startedAt = Date.now();
  const response = await fetchWithPolicy(url, {
    headers: {
      Accept: "application/json",
      Cookie: appSessionCookieHeader(appSession)
    },
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
  log("session status request completed", { url, status: response.status, durationMs: Date.now() - startedAt });
  return { response, body, url };
}

async function metadataForToken(tokenInfo) {
  return tokenInfo?.cached?.metadata || discoverMetadata();
}

async function fetchUserInfoForToken(accessToken, metadata) {
  if (!metadata?.userinfo_endpoint) {
    return undefined;
  }
  return fetchJsonResponse(metadata.userinfo_endpoint, {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` }
  });
}

function tokenExpiryLine(tokenInfo) {
  const cached = tokenInfo?.cached;
  if (!cached) {
    return "- expires: (not provided)";
  }
  const expiresAt = tokenExpiresAt(cached, 0);
  return expiresAt > 0 ? `- expires: ${new Date(expiresAt).toISOString()}` : "- expires: (not provided)";
}

function formatSessionReadiness(sessionResult) {
  if (!sessionResult) {
    return ["App session:", "- status: not checked", "- detail: no session endpoint is configured"];
  }
  const { response, body, url } = sessionResult;
  if (response.ok) {
    return ["App session:", `- status: ${body?.status || "unknown"}`, `- endpoint: ${url}`];
  }
  return ["App session:", "- status: invalid", `- endpoint: ${url}`, `- HTTP: ${response.status}`, `- response: ${JSON.stringify(body)}`];
}

function formatUserInfoStatus(userInfo, context, tokenInfo, sessionResult) {
  return [
    `Auth status: authenticated (${context})`,
    "OAuth userinfo endpoint: verified",
    "",
    "User:",
    `- name: ${userInfo.name || "(unknown)"}`,
    `- email: ${userInfo.email || "(unknown)"}`,
    `- id: ${userInfo.sub || userInfo.id || "(unknown)"}`,
    `- username: ${userInfo.preferred_username || "(not provided)"}`,
    tokenExpiryLine(tokenInfo),
    "",
    ...formatSessionReadiness(sessionResult),
    "",
    "Permissions:",
    roleSummary(userInfo.resource_access)
  ].join("\n");
}

function parseFutureExpiry(value, label) {
  const expiresAt = Date.parse(value);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error(`Wrap response did not include a future ${label}.`);
  }
  return expiresAt;
}

function appSessionFromWrapResponse(body) {
  if (!body?.success || !body.token || !body.cookieName || !body.expiresAt) {
    throw new Error("Wrap response did not include a wrapped app session token.");
  }

  return {
    token: body.token,
    cookie_name: body.cookieName,
    expires_at: parseFutureExpiry(body.expiresAt, "session expiry"),
    expires_at_iso: body.expiresAt,
    source_token_expires_at: body.sourceTokenExpiresAt || undefined,
    session_expires_at: body.sessionExpiresAt || undefined,
    wrapped_at: Date.now()
  };
}

function shouldPersistDerivedSession(token) {
  return Boolean(token?.metadata || token?.cached_at);
}

async function wrapAccessToken(token) {
  const url = wrapEndpointUrl();
  log("requesting wrapped app session", { url });
  const body = await fetchJson(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token.access_token}`
    }
  });
  const appSession = appSessionFromWrapResponse(body);
  const tokenWithAppSession = { ...token, app_session: appSession };
  if (shouldPersistDerivedSession(token)) {
    await writeCachedToken(tokenWithAppSession);
  }
  log("wrapped app session acquired", {
    url,
    cookieName: appSession.cookie_name,
    expiresAt: appSession.expires_at_iso
  });
  return appSession;
}

async function acquireAppSession(token) {
  if (isUsableCachedAppSession(token, tokenSkewMs())) {
    log("using cached wrapped app session");
    return token.app_session;
  }
  return wrapAccessToken(token);
}

function requiredToolArgument(args, name) {
  const value = args?.[name];
  if (value === undefined || value === null || value === "") {
    throw new Error(`${name} is required.`);
  }
  return value;
}

async function memoryApiRequest(method, url, body) {
  const token = await acquireToken();
  const appSession = await acquireAppSession(token);
  const responseResult = await fetchJsonResponse(url, {
    method,
    headers: {
      Accept: "application/json",
      Cookie: appSessionCookieHeader(appSession),
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (!responseResult.response.ok) {
    const detail = responseResult.body?.message || responseResult.body?.error || `HTTP ${responseResult.response.status}`;
    throw new Error(`Memory API ${method} ${url} failed: ${detail}`);
  }
  return responseResult.body;
}

async function callMemoryTool(name, args = {}) {
  switch (name) {
    case "listMemories":
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
      }));
    case "createMemory":
      return memoryApiRequest("POST", memoryEndpointUrl("memories/"), {
        text: requiredToolArgument(args, "text"),
        ...(args.metadata === undefined ? {} : { metadata: args.metadata }),
        ...(args.infer === undefined ? {} : { infer: args.infer }),
        ...(args.app === undefined ? {} : { app: args.app })
      });
    case "getMemoryCategories":
      return memoryApiRequest("GET", memoryEndpointUrl("memories/categories"));
    case "getMemory":
      return memoryApiRequest(
        "GET",
        memoryEndpointUrl(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}`)
      );
    case "updateMemory":
      return memoryApiRequest(
        "PUT",
        memoryEndpointUrl(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}`),
        { memory_content: requiredToolArgument(args, "memory_content") }
      );
    case "searchMemories":
      return memoryApiRequest("POST", memoryEndpointUrl("memories/search"), {
        query: requiredToolArgument(args, "query"),
        ...(args.numberOfHits === undefined ? {} : { numberOfHits: args.numberOfHits }),
        ...(args.page === undefined ? {} : { page: args.page }),
        ...(args.filters === undefined ? {} : { filters: args.filters })
      });
    case "getRelatedMemories":
      return memoryApiRequest(
        "GET",
        memoryEndpointUrl(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}/related`, {
          page: args.page,
          size: args.size
        })
      );
    default:
      throw new Error(`Unknown memory tool ${name}`);
  }
}

function formatSessionStatus(sessionResult, context, tokenInfo, userInfoResult) {
  const session = sessionResult.body?.data || {};
  const user = session.user || {};
  const lines = [
    `Auth status: authenticated (${context})`,
    "App session endpoint: verified",
    "",
    "User:",
    `- name: ${user.name || "(unknown)"}`,
    `- email: ${user.email || "(unknown)"}`,
    `- id: ${user.id || user.subject || "(unknown)"}`,
    tokenExpiryLine(tokenInfo),
    "",
    ...formatSessionReadiness(sessionResult)
  ];

  if (userInfoResult?.response) {
    lines.push(
      "",
      "OAuth userinfo:",
      `- endpoint: ${userInfoResult.url}`,
      `- HTTP: ${userInfoResult.response.status}`
    );
  }
  return lines.join("\n");
}

async function verifiedAuthStatus(accessToken, context, tokenInfo = {}) {
  let userInfoResult;
  try {
    userInfoResult = await fetchUserInfoForToken(accessToken, await metadataForToken(tokenInfo));
  } catch (error) {
    userInfoResult = { error };
  }

  let appSession;
  try {
    appSession = await acquireAppSession(tokenInfo.cached || { access_token: accessToken });
  } catch (error) {
    appSession = { error };
  }
  const sessionResult = appSession?.token
    ? await fetchSessionForAppSession(appSession).catch((error) => ({ error }))
    : { error: appSession.error };
  if (userInfoResult?.response?.ok) {
    return formatUserInfoStatus(userInfoResult.body, context, tokenInfo, sessionResult.response ? sessionResult : undefined);
  }
  if (isAuthenticatedSessionResult(sessionResult)) {
    return formatSessionStatus(sessionResult, context, tokenInfo, userInfoResult);
  }

  const userInfoRejected = userInfoResult?.response?.status === 401;
  const sessionRejected = sessionResult?.response?.status === 401 || sessionResult?.response?.status === 403;
  const lines = [
    `${userInfoRejected || sessionRejected ? "Auth status: token unauthenticated" : "Auth status: unknown"} (${context})`
  ];
  if (userInfoResult?.response) {
    lines.push(`OAuth userinfo endpoint ${userInfoResult.url} returned HTTP ${userInfoResult.response.status}.`);
    lines.push(`Response: ${JSON.stringify(userInfoResult.body)}`);
  } else if (userInfoResult?.error) {
    lines.push(`OAuth userinfo verification failed: ${userInfoResult.error.message}`);
  } else {
    lines.push("OAuth metadata did not provide a userinfo endpoint.");
  }
  if (sessionResult?.response) {
    lines.push(...formatSessionReadiness(sessionResult));
  } else if (sessionResult?.error) {
    lines.push(`App session check failed: ${sessionResult.error.message}`);
  }
  return lines.join("\n");
}

async function authStatusSummary() {
  const tokenInfo = await currentAccessToken();
  if (!tokenInfo?.token) {
    return "Auth status: unauthenticated (no cached or configured access token).";
  }
  return verifiedAuthStatus(tokenInfo.token, tokenInfo.source, tokenInfo);
}

async function loginAndSummarizeStatus() {
  const metadata = await discoverMetadata();
  const token = await deviceAuthorization(metadata);
  if (!token?.access_token) {
    throw new Error("Login flow did not return an access token.");
  }
  const acquired = { ...token, metadata };
  await writeCachedToken(acquired);
  return ["Login successful. Cached new access token.", "", await verifiedAuthStatus(acquired.access_token, "new-login", { cached: acquired })].join("\n");
}

async function callHelperTool(id, name, args = {}) {
  try {
    if (memoryTools.some((tool) => tool.name === name)) {
      sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await callMemoryTool(name, args)) });
      return;
    }

    if (name === "mcp_resource_auth_list_abilities") {
      const [tools, resources, templates] = await Promise.all([
        listTools().catch(() => helperTools),
        listResources().catch(() => []),
        listResourceTemplates().catch(() => [])
      ]);
      sendToClient({ jsonrpc: "2.0", id, result: textToolResult(formatAbilities(tools, resources, templates)) });
      return;
    }

    if (name === "mcp_resource_auth_list_resources") {
      const [resources, templates] = await Promise.all([
        listResources().catch(() => []),
        listResourceTemplates().catch(() => [])
      ]);
      sendToClient({ jsonrpc: "2.0", id, result: textToolResult(formatResourceDirectory(resources, templates)) });
      return;
    }

    if (name === "mcp_resource_auth_manage_auth") {
      if (args?.action === "clear-cache") {
        sendToClient({ jsonrpc: "2.0", id, result: textToolResult(await clearCachedToken()) });
      } else if (args?.action === "status") {
        sendToClient({ jsonrpc: "2.0", id, result: textToolResult(await authStatusSummary()) });
      } else if (args?.action === "login") {
        sendToClient({ jsonrpc: "2.0", id, result: textToolResult(await loginAndSummarizeStatus()) });
      } else {
        sendToClient(errorResponse(id, -32602, "action must be one of: status, clear-cache, login"));
      }
      return;
    }

    sendToClient(errorResponse(id, -32601, `Unknown helper tool ${name}`));
  } catch (error) {
    sendToClient(errorResponse(id, -32000, error.message));
  }
}

function localInitializeResult(params = {}) {
  return {
    protocolVersion: params.protocolVersion || "2024-11-05",
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
    serverInfo: {
      name: "compliance-theater-2000",
      version: "0.1.0"
    }
  };
}

async function handleClientRequest(message) {
  log("handling client request", summarizeMessage(message));

  if (message.method === "initialize") {
    sendToClient({ jsonrpc: "2.0", id: message.id, result: localInitializeResult(message.params) });
    return;
  }

  if (message.method === "notifications/initialized") {
    return;
  }

  if (message.method === "tools/list") {
    let tools = [...helperTools];
    try {
      tools = await listTools();
    } catch (error) {
      log(`remote tools/list failed: ${error.message}`);
    }
    sendToClient({ jsonrpc: "2.0", id: message.id, result: { tools } });
    return;
  }

  if (message.method === "tools/call") {
    const name = message.params?.name;
    if (helperTools.some((tool) => tool.name === name)) {
      await callHelperTool(message.id, name, message.params?.arguments || {});
      return;
    }
    if (!exposedRemoteToolNames.has(name)) {
      sendToClient(errorResponse(message.id, -32601, `Tool ${name || "(missing)"} is not exposed by this plugin.`));
      return;
    }
  }

  if (message.id === undefined) {
    remoteNotification(message.method, message.params || {}).catch((error) => log(`remote notification failed: ${error.message}`));
    return;
  }

  try {
    const result = await remoteRequest(message.method, message.params || {});
    sendToClient({ jsonrpc: "2.0", id: message.id, result });
  } catch (error) {
    sendToClient(errorResponse(message.id, -32000, error.message));
  }
}

function bindJsonLines(stream, onMessage, source) {
  const reader = createInterface({ input: stream });
  reader.on("line", (line) => {
    if (!line.trim()) {
      return;
    }
    try {
      const message = JSON.parse(line);
      log(`received ${source} message`, summarizeMessage(message));
      onMessage(message);
    } catch (error) {
      log(`could not parse ${source} JSON message: ${error.message}`);
    }
  });
}

async function main() {
  log("wrapper starting", { cwd: process.cwd(), node: process.version, argv: process.argv });
  log("resolved wrapper configuration", {
    serverUrl: optional("SERVER_URL"),
    authIssuer: optional("AUTH_ISSUER"),
    wrapUrl: wrapEndpointUrl(),
    sessionStatusUrl: sessionEndpointUrl(),
    tokenCachePath: cachePath(),
    logFile: logFilePath()
  });

  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));

  bindJsonLines(process.stdin, (message) => {
    handleClientRequest(message).catch((error) => {
      if (message.id !== undefined) {
        sendToClient(errorResponse(message.id, -32000, error.message));
      } else {
        log(error.message);
      }
    });
  }, "client");
}

main().catch((error) => {
  log("wrapper startup failed", { message: error.message, stack: error.stack });
  process.exit(1);
});
