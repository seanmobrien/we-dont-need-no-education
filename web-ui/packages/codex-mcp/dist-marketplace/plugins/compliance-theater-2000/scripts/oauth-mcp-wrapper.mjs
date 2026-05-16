#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomInt } from "node:crypto";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { homedir } from "node:os";
import { rm } from "node:fs/promises";
import {
  fetchWithPolicy,
  parseNumber,
  readCachedTokenFile,
  sleep,
  warnIfInsecureUrl,
  writeCachedTokenFile
} from "./runtime-utils.mjs";

const PREFIX = "MCP_COMPLIANCE_THEATER_RESOURCE_";
const env = process.env;
let nextProxyId = randomInt(1_000_000, 9_000_000);
const clientRequests = new Set();
const proxyRequests = new Map();
let child;
let registeredClient;
let shuttingDown = false;

const helperTools = [
  {
    name: "mcp_resource_auth_list_abilities",
    description: "List tools exposed by the authenticated MCP server, plus resource and resource template counts.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "mcp_resource_auth_list_resources",
    description: "Return a directory-style listing of resources and resource templates exposed by the authenticated MCP server.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
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
  }
];

function log(message) {
  console.error(`[mcp-resource-auth] ${message}`);
}

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

function required(name) {
  const value = optional(name);
  if (!value || value.startsWith("[TODO:")) {
    throw new Error(`Missing required environment variable ${key(name)}`);
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

function cachePath() {
  return optional("TOKEN_CACHE_PATH") ||
    join(homedir(), ".codex", "mcp-resource-auth", "compliance-theater-token-cache.json");
}

function tokenSkewMs() {
  return parseNumber(optional("TOKEN_EXPIRY_SKEW_SECONDS"), 60, 0) * 1000;
}

function httpTimeoutMs() {
  return parseNumber(optional("HTTP_TIMEOUT_MS"), 15000, 1000);
}

function httpRetryCount() {
  return parseNumber(optional("HTTP_RETRY_COUNT"), 2, 0);
}

function httpRetryBaseMs() {
  return parseNumber(optional("HTTP_RETRY_BASE_MS"), 500, 0);
}

function proxyRequestTimeoutMs() {
  return parseNumber(optional("PROXY_REQUEST_TIMEOUT_MS"), 30000, 1000);
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

async function fetchJson(url, options = {}) {
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

  if (!response.ok) {
    const error = body.error || body.error_description || `HTTP ${response.status}`;
    throw new Error(String(error));
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
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    return { Authorization: `Basic ${basic}` };
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

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh
  });

  const scope = optional("OAUTH_SCOPE");
  if (scope) {
    body.set("scope", scope);
  }

  log("requesting access token with refresh_token grant");
  return tokenRequest(metadata, body);
}

async function clientCredentials(metadata) {
  if (!hasGrant(metadata, "client_credentials")) {
    return undefined;
  }
  if (!optional("CLIENT_ID") || !optional("CLIENT_SECRET")) {
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
  if (!hasGrant(metadata, "password")) {
    return undefined;
  }
  if (!optional("USERNAME") || !optional("PASSWORD")) {
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
  const response = await fetchJson(metadata.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "MCP Resource Auth",
      grant_types: ["urn:ietf:params:oauth:grant-type:device_code"],
      token_endpoint_auth_method: "none",
      ...(scope ? { scope } : {})
    })
  });

  if (!response.client_id) {
    throw new Error("dynamic client registration response did not include client_id");
  }

  registeredClient = response;
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
        continue;
      }
      if (message.includes("authorization_pending")) {
        continue;
      }
      throw error;
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
    throw new Error(
      `No supported OAuth flow could be selected. Server grants: ${grants.join(", ")}`
    );
  }

  const acquired = { ...token, metadata };
  await writeCachedToken(acquired);
  return acquired;
}

function parseArgs() {
  const raw = required("MCP_ARGS");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
      throw new Error("must be a JSON array of strings");
    }
    return parsed;
  } catch (error) {
    throw new Error(`${key("MCP_ARGS")} ${error.message}`);
  }
}

function sendToClient(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendToChild(message) {
  if (!child?.stdin || child.stdin.destroyed || !child.stdin.writable) {
    throw new Error("MCP child process is not available");
  }
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function errorResponse(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message }
  };
}

function textToolResult(text) {
  return {
    content: [{ type: "text", text }]
  };
}

function proxyRequest(method, params = {}) {
  const id = nextProxyId++;
  return new Promise((resolve, reject) => {
    const timeoutMs = proxyRequestTimeoutMs();
    const timeoutHandle = setTimeout(() => {
      if (proxyRequests.delete(id)) {
        reject(new Error(`${method} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    timeoutHandle.unref();

    proxyRequests.set(id, { resolve, reject, timeoutHandle });

    try {
      sendToChild({ jsonrpc: "2.0", id, method, params });
    } catch (error) {
      clearTimeout(timeoutHandle);
      proxyRequests.delete(id);
      reject(error);
    }
  });
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
      result = await proxyRequest(method, cursor ? { cursor } : {});
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
  const tools = await collectPaginated("tools/list", "tools");
  return [...tools, ...helperTools];
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
  if (templates.length) {
    for (const template of templates) {
      lines.push(`- ${template.uriTemplate}: ${template.name || template.description || "Template"}`);
    }
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
  const baseUrl = required("SERVER_URL");
  const parsed = new URL(baseUrl);
  parsed.pathname = "/api/auth/session";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

async function clearCachedToken() {
  if (optional("DISABLE_TOKEN_CACHE") === "1") {
    return "Token cache is disabled by MCP_COMPLIANCE_THEATER_RESOURCE_DISABLE_TOKEN_CACHE=1.";
  }

  const path = cachePath();
  try {
    await rm(path);
    return `Removed cached token file: ${path}`;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return `No cached token file found at: ${path}`;
    }
    throw error;
  }
}

async function currentAccessToken() {
  const explicit = optional("ACCESS_TOKEN");
  if (explicit) {
    return {
      token: explicit,
      source: "env:ACCESS_TOKEN"
    };
  }

  const cached = await readCachedToken();
  if (cached?.access_token) {
    return {
      token: cached.access_token,
      source: "cached-token"
    };
  }

  return undefined;
}

function roleSummary(resourceAccess) {
  if (!resourceAccess || typeof resourceAccess !== "object") {
    return "none";
  }
  const entries = Object.entries(resourceAccess)
    .map(([resourceName, details]) => {
      const roles = Array.isArray(details?.roles) ? details.roles : [];
      return `${resourceName}: ${roles.join(", ") || "(no roles)"}`;
    });
  return entries.length ? entries.join("\n") : "none";
}

async function fetchSessionForToken(accessToken) {
  const url = sessionEndpointUrl();
  const response = await fetchWithPolicy(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
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

  return {
    response,
    body,
    url
  };
}

function formatSessionStatus(statusBody, context) {
  const status = statusBody?.status || "unauthenticated";
  const sessionData = statusBody?.data;
  if (status !== "authenticated" || !sessionData?.user) {
    return [
      `Auth status: unauthenticated (${context})`,
      "Session endpoint indicates this token is not authenticated."
    ].join("\n");
  }

  const user = sessionData.user || {};
  const scope = statusBody?.scope || sessionData?.scope || "(not provided)";
  return [
    `Auth status: authenticated (${context})`,
    `Session endpoint: ${sessionData.expires ? "valid" : "no expiry supplied"}`,
    "",
    "User:",
    `- name: ${user.name || "(unknown)"}`,
    `- email: ${user.email || "(unknown)"}`,
    `- id: ${user.id || "(unknown)"}`,
    `- hash: ${user.hash || "(not provided)"}`,
    `- expires: ${sessionData.expires || "(not provided)"}`,
    `- scope: ${scope}`,
    "",
    "Permissions:",
    roleSummary(sessionData.resource_access)
  ].join("\n");
}

async function authStatusSummary() {
  const tokenInfo = await currentAccessToken();
  if (!tokenInfo?.token) {
    return "Auth status: unauthenticated (no cached or configured access token).";
  }

  const { response, body, url } = await fetchSessionForToken(tokenInfo.token);
  if (response.status === 401 || response.status === 403) {
    return [
      `Auth status: cached token unauthenticated (${tokenInfo.source})`,
      `Session endpoint rejected token at ${url} with HTTP ${response.status}.`
    ].join("\n");
  }

  if (!response.ok) {
    return [
      `Auth status: unknown (${tokenInfo.source})`,
      `Session endpoint ${url} returned HTTP ${response.status}.`,
      `Response: ${JSON.stringify(body)}`
    ].join("\n");
  }

  return formatSessionStatus(body, tokenInfo.source);
}

async function loginAndSummarizeStatus() {
  const metadata = await discoverMetadata();
  const token = await deviceAuthorization(metadata);
  if (!token?.access_token) {
    throw new Error("Login flow did not return an access token.");
  }

  const acquired = { ...token, metadata };
  await writeCachedToken(acquired);

  const { response, body, url } = await fetchSessionForToken(acquired.access_token);
  if (!response.ok) {
    return [
      "Auth login completed, but session verification failed.",
      `Session endpoint ${url} returned HTTP ${response.status}.`,
      `Response: ${JSON.stringify(body)}`
    ].join("\n");
  }

  return [
    "Login successful. Cached new access token.",
    "",
    formatSessionStatus(body, "new-login")
  ].join("\n");
}

async function callHelperTool(id, name, args = {}) {
  try {
    if (name === "mcp_resource_auth_list_abilities") {
      const [tools, resources, templates] = await Promise.all([
        listTools(),
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
      const action = args?.action;
      if (action === "clear-cache") {
        const message = await clearCachedToken();
        sendToClient({ jsonrpc: "2.0", id, result: textToolResult(message) });
        return;
      }

      if (action === "status") {
        const message = await authStatusSummary();
        sendToClient({ jsonrpc: "2.0", id, result: textToolResult(message) });
        return;
      }

      if (action === "login") {
        const message = await loginAndSummarizeStatus();
        sendToClient({ jsonrpc: "2.0", id, result: textToolResult(message) });
        return;
      }

      sendToClient(errorResponse(id, -32602, "action must be one of: status, clear-cache, login"));
      return;
    }

    sendToClient(errorResponse(id, -32601, `Unknown helper tool ${name}`));
  } catch (error) {
    sendToClient(errorResponse(id, -32000, error.message));
  }
}

async function handleClientRequest(message) {
  if (message.method === "tools/list") {
    try {
      const result = await proxyRequest("tools/list", message.params || {});
      const tools = [...(result.tools || []), ...helperTools];
      sendToClient({ jsonrpc: "2.0", id: message.id, result: { ...result, tools } });
    } catch (error) {
      sendToClient(errorResponse(message.id, -32000, error.message));
    }
    return;
  }

  if (message.method === "tools/call") {
    const name = message.params?.name;
    if (helperTools.some((tool) => tool.name === name)) {
      await callHelperTool(message.id, name, message.params?.arguments || {});
      return;
    }
  }

  if (message.id !== undefined) {
    clientRequests.add(message.id);
  }
  sendToChild(message);
}

function handleChildMessage(message) {
  if (message.id !== undefined && proxyRequests.has(message.id)) {
    const pending = proxyRequests.get(message.id);
    proxyRequests.delete(message.id);
    clearTimeout(pending.timeoutHandle);
    if (message.error) {
      pending.reject(new Error(message.error.message || "MCP child request failed"));
    } else {
      pending.resolve(message.result || {});
    }
    return;
  }

  if (message.id !== undefined && clientRequests.has(message.id)) {
    clientRequests.delete(message.id);
  }
  sendToClient(message);
}

function failPendingRequests(message) {
  for (const [id, pending] of proxyRequests) {
    clearTimeout(pending.timeoutHandle);
    pending.reject(new Error(message));
  }
  proxyRequests.clear();

  for (const id of clientRequests) {
    sendToClient(errorResponse(id, -32000, message));
  }
  clientRequests.clear();
}

function shutdown(reason) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  failPendingRequests(reason);
  if (child && child.exitCode === null && !child.killed) {
    child.kill();
    return;
  }
  process.exit(0);
}

function bindJsonLines(stream, onMessage, source) {
  const reader = createInterface({ input: stream });
  reader.on("line", (line) => {
    if (!line.trim()) {
      return;
    }
    try {
      onMessage(JSON.parse(line));
    } catch (error) {
      log(`could not parse ${source} JSON message: ${error.message}`);
    }
  });
}

async function main() {
  const token = await acquireToken();
  const command = required("MCP_COMMAND");
  const args = parseArgs();
  const childTokenEnv = optional("CHILD_ACCESS_TOKEN_ENV") || key("ACCESS_TOKEN");
  const childEnv = {
    ...env,
    [key("ACCESS_TOKEN")]: token.access_token,
    [key("OAUTH_METADATA_JSON")]: token.metadata ? JSON.stringify(token.metadata) : "",
    [childTokenEnv]: token.access_token
  };

  log(`starting MCP server command: ${command}`);
  child = spawn(command, args, {
    env: childEnv,
    stdio: ["pipe", "pipe", "inherit"],
    shell: process.platform === "win32"
  });

  process.on("SIGINT", () => shutdown("Received SIGINT"));
  process.on("SIGTERM", () => shutdown("Received SIGTERM"));

  bindJsonLines(process.stdin, (message) => {
    handleClientRequest(message).catch((error) => {
      if (message.id !== undefined) {
        sendToClient(errorResponse(message.id, -32000, error.message));
      } else {
        log(error.message);
      }
    });
  }, "client");

  bindJsonLines(child.stdout, handleChildMessage, "child");

  child.on("error", (error) => {
    failPendingRequests(`MCP child process failed: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    const message = signal ?
      `MCP child exited due to ${signal}` :
      `MCP child exited with code ${code ?? 0}`;
    failPendingRequests(message);
    if (shuttingDown) {
      process.exit(0);
      return;
    }
    process.exit(code ?? (signal ? 1 : 0));
  });
}

main().catch((error) => {
  log(error.message);
  process.exit(1);
});
