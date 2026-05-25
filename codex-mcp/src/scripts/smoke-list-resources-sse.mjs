#!/usr/bin/env node
import { join } from "node:path";
import { homedir } from "node:os";
import {
  connectSse,
  parseNumber,
  readCachedTokenFile,
  readRpcResult,
  rpc,
  warnIfInsecureUrl
} from "./runtime-utils.js";

const PREFIX = "MCP_COMPLIANCE_THEATER_RESOURCE_";

function readEnv(name) {
  return process.env[`${PREFIX}${name}`];
}

const sseUrl = readEnv("SERVER_URL") ||
  "http://localhost:3000/api/ai/tools/sse";
const tokenCachePath = readEnv("TOKEN_CACHE_PATH") ||
  join(homedir(), ".codex", "compliance-theater", "compliance-theater-token-cache.json");
const stageTimeoutMs = parseNumber(readEnv("SMOKE_TIMEOUT_SECONDS"), 30, 1) * 1000;
const httpTimeoutMs = parseNumber(readEnv("HTTP_TIMEOUT_MS"), 15000, 1000);
const httpRetries = parseNumber(readEnv("HTTP_RETRY_COUNT"), 1, 0);
const httpRetryBaseMs = parseNumber(readEnv("HTTP_RETRY_BASE_MS"), 500, 0);
const tokenSkewMs = parseNumber(readEnv("TOKEN_EXPIRY_SKEW_SECONDS"), 60, 0) * 1000;
const logger = (message) => console.error(message);

warnIfInsecureUrl(sseUrl, logger, "SSE URL");

async function readCachedToken() {
  const cached = await readCachedTokenFile(tokenCachePath, { skewMs: tokenSkewMs, logger });
  if (!cached) {
    throw new Error(`Cached token missing or expired at ${tokenCachePath}`);
  }
  return cached;
}

function resourcePath(resource) {
  try {
    const parsed = new URL(resource.uri);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return resource.uri;
  }
}

function printResourceDirectory(resources, templates) {
  console.log(`Resources (${resources.length}):`);
  const sorted = [...resources].sort((a, b) => resourcePath(a).localeCompare(resourcePath(b)));
  if (!sorted.length) {
    console.log("- No concrete resources exposed.");
  }
  for (const resource of sorted) {
    const name = resource.name ? ` (${resource.name})` : "";
    const mime = resource.mimeType ? ` [${resource.mimeType}]` : "";
    console.log(`- ${resourcePath(resource)}${name}${mime}`);
    if (resource.description) {
      console.log(`  ${resource.description}`);
    }
  }

  console.log("");
  console.log(`Resource templates (${templates.length}):`);
  if (!templates.length) {
    console.log("- No resource templates exposed.");
  }
  for (const template of templates) {
    const name = template.name ? ` (${template.name})` : "";
    console.log(`- ${template.uriTemplate}${name}`);
    if (template.description) {
      console.log(`  ${template.description}`);
    }
  }
}

const token = await readCachedToken();
const { endpoint, reader } = await connectSse({
  sseUrl,
  accessToken: token.access_token,
  timeoutMs: stageTimeoutMs,
  httpTimeoutMs,
  httpRetries,
  httpRetryBaseMs,
  logger
});
console.error(`SSE endpoint: ${endpoint}`);

const rpcOptions = {
  timeoutMs: httpTimeoutMs,
  retries: httpRetries,
  retryBaseMs: httpRetryBaseMs,
  logger
};

await rpc(endpoint, token.access_token, 1, "initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "codex-resource-smoke", version: "0.1.0" }
}, rpcOptions);
await readRpcResult(reader, 1, stageTimeoutMs);
await rpc(endpoint, token.access_token, 2, "notifications/initialized", {}, rpcOptions);
await rpc(endpoint, token.access_token, 3, "resources/list", {}, rpcOptions);
let listedResources = { resources: [] };
try {
  listedResources = await readRpcResult(reader, 3, stageTimeoutMs);
} catch (error) {
  if (!String(error.message).toLowerCase().includes("method not found")) {
    throw error;
  }
}
await rpc(endpoint, token.access_token, 4, "resources/templates/list", {}, rpcOptions);
let listedTemplates = { resourceTemplates: [] };
try {
  listedTemplates = await readRpcResult(reader, 4, stageTimeoutMs);
} catch (error) {
  if (!String(error.message).toLowerCase().includes("method not found")) {
    throw error;
  }
}
printResourceDirectory(listedResources.resources || [], listedTemplates.resourceTemplates || []);
await reader.cancel();
