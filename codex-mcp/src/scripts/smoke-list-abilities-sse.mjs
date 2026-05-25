#!/usr/bin/env node

import { join } from "node:path";
import { homedir } from "node:os";
import {
  connectSse,
  fetchWithPolicy,
  parseNumber,
  readCachedTokenFile,
  readRpcResult,
  rpc,
  warnIfInsecureUrl,
  writeCachedTokenFile
} from "./runtime-utils.js";

const PREFIX = "MCP_COMPLIANCE_THEATER_RESOURCE_";

function readEnv(name) {
  return process.env[`${PREFIX}${name}`];
}

const issuer = readEnv("AUTH_ISSUER") ||
  "https://login.obapps.net/realms/compliance-theater";
const clientId = readEnv("CLIENT_ID") || "codex";
const clientSecret = readEnv("CLIENT_SECRET");
const scope = readEnv("OAUTH_SCOPE") || "openid";
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

warnIfInsecureUrl(issuer, logger, "OAuth issuer");
warnIfInsecureUrl(sseUrl, logger, "SSE URL");

if (!clientSecret) {
  throw new Error("MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_SECRET is required for this smoke test");
}

async function formPost(url, body) {
  const response = await fetchWithPolicy(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    timeoutMs: httpTimeoutMs,
    retries: httpRetries,
    retryBaseMs: httpRetryBaseMs,
    logger
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!response.ok) {
    throw new Error(json.error_description || json.error || `HTTP ${response.status}`);
  }
  return json;
}

async function readCachedToken() {
  return readCachedTokenFile(tokenCachePath, { skewMs: tokenSkewMs, logger });
}

async function writeCachedToken(token) {
  await writeCachedTokenFile(tokenCachePath, token, { logger });
}

async function deviceToken() {
  const device = await formPost(`${issuer}/protocol/openid-connect/auth/device`, {
    client_id: clientId,
    client_secret: clientSecret,
    scope
  });

  console.error(`Open: ${device.verification_uri_complete || device.verification_uri}`);
  if (device.user_code) {
    console.error(`Code: ${device.user_code}`);
  }

  const intervalMs = Math.max(Number(device.interval || 5), 1) * 1000;
  const expiresAt = Date.now() + Number(device.expires_in || 600) * 1000;
  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    try {
      return await formPost(`${issuer}/protocol/openid-connect/token`, {
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: device.device_code,
        client_id: clientId,
        client_secret: clientSecret
      });
    } catch (error) {
      if (
        String(error.message).includes("authorization_pending") ||
        String(error.message).toLowerCase().includes("still pending")
      ) {
        console.error("authorization pending");
        continue;
      }
      throw error;
    }
  }
  throw new Error("Timed out waiting for device authorization");
}

function printTools(tools) {
  console.log(`Tools (${tools.length}):`);
  for (const tool of tools) {
    console.log(`- ${tool.name}: ${tool.description || "No description"}`);
    if (tool.inputSchema) {
      console.log(`  inputSchema: ${JSON.stringify(tool.inputSchema)}`);
    }
  }
}

const token = await readCachedToken() || await deviceToken();
if (!token.expires_at) {
  await writeCachedToken(token);
}
console.error("token acquired");
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
  clientInfo: { name: "codex-smoke", version: "0.1.0" }
}, rpcOptions);
await readRpcResult(reader, 1, stageTimeoutMs);
await rpc(endpoint, token.access_token, 2, "notifications/initialized", {}, rpcOptions);
await rpc(endpoint, token.access_token, 3, "tools/list", {}, rpcOptions);
const listed = await readRpcResult(reader, 3, stageTimeoutMs);
printTools(listed.tools || []);
await reader.cancel();
