import { randomInt } from "node:crypto";
import {
  type AppSession,
  appSessionCookieHeader,
  connectSse,
  fetchWithPolicy,
  readRpcResult,
  rpc,
  warnIfInsecureUrl,
} from "./runtime-utils";
import {
  httpRetryBaseMs,
  httpRetryCount,
  httpTimeoutMs,
  log,
  proxyRequestTimeoutMs,
  required,
} from "./config";
import { acquireAppSession, acquireToken } from "./auth";
import { asError, isHttpBadRequest } from "./errors";
import type {
  AnyRecord,
  CachedToken,
  JsonRpcMessage,
  RemoteConnection,
  ToolArgs,
} from "./types";

export type RefreshRemoteToken = (reason: string) => Promise<CachedToken>;

let remote: RemoteConnection | undefined;
let remoteQueue: Promise<AnyRecord> = Promise.resolve({});

async function connectRemote(refreshToken: RefreshRemoteToken): Promise<RemoteConnection> {
  if (remote) {
    return remote;
  }

  const token = await acquireToken();
  try {
    return await establishRemoteConnection(token);
  } catch (error) {
    if (!isHttpBadRequest(error)) {
      throw error;
    }
    const freshToken = await refreshToken("remote MCP connection returned HTTP 400");
    return establishRemoteConnection(freshToken);
  }
}

async function optionalAppSessionForMcpTransport(token: CachedToken): Promise<{
  appSession?: AppSession;
  sessionCookie?: string;
}> {
  let appSession;
  let sessionCookie;
  try {
    appSession = await acquireAppSession(token);
    sessionCookie = appSessionCookieHeader(appSession);
  } catch (error) {
    if (isHttpBadRequest(error)) {
      throw error;
    }
    log(`wrapped app session unavailable for MCP transport; falling back to source bearer: ${asError(error).message}`);
  }
  return { appSession, sessionCookie };
}

async function establishRemoteConnection(token: CachedToken): Promise<RemoteConnection> {
  const { appSession, sessionCookie } = await optionalAppSessionForMcpTransport(token);
  const sseUrl = required("SERVER_URL");
  warnIfInsecureUrl(sseUrl, log, "Target server URL");
  log("connecting remote MCP SSE", { sseUrl });
  const connection = await connectSse({
    sseUrl,
    accessToken: token.access_token,
    sessionCookie,
    timeoutMs: proxyRequestTimeoutMs(),
    httpTimeoutMs: httpTimeoutMs(),
    httpRetries: httpRetryCount(),
    httpRetryBaseMs: httpRetryBaseMs(),
    logger: log
  });
  remote = Object.assign(connection, {
    accessToken: token.access_token,
    appSession,
    sessionCookie,
    nextId: randomInt(100_000, 999_999)
  });
  await rawRemoteRequest(remote, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "compliance_theater_2000_codex_plugin", version: "0.1.0" }
  });
  await remoteNotification("notifications/initialized", {}, refreshTokenFallback);
  log("remote MCP initialized", { endpoint: remote.endpoint });
  return remote;
}

let refreshTokenFallback: RefreshRemoteToken = async () => {
  throw new Error("Remote refresh callback was not configured.");
};

export async function remoteNotification(method: string, params: ToolArgs = {}, refreshToken: RefreshRemoteToken): Promise<void> {
  refreshTokenFallback = refreshToken;
  const connection = remote || await connectRemote(refreshToken);
  await postRemoteJson(connection, { jsonrpc: "2.0", method, params });
}

async function postRemoteJson(connection: RemoteConnection, message: JsonRpcMessage): Promise<void> {
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

export function remoteRequest(method: string, params: ToolArgs = {}, refreshToken: RefreshRemoteToken): Promise<AnyRecord> {
  refreshTokenFallback = refreshToken;
  remoteQueue = remoteQueue.catch(() => ({})).then(async () => {
    const connection = remote || await connectRemote(refreshToken);
    try {
      return await rawRemoteRequest(connection, method, params);
    } catch (error) {
      if (!isHttpBadRequest(error)) {
        throw error;
      }
      const freshToken = await refreshToken(`remote MCP request ${method} returned HTTP 400`);
      const retryConnection = await establishRemoteConnection(freshToken);
      return rawRemoteRequest(retryConnection, method, params);
    }
  });
  return remoteQueue;
}

async function rawRemoteRequest(
  connection: RemoteConnection,
  method: string,
  params: ToolArgs = {}
): Promise<AnyRecord> {
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

export async function clearRemoteState(): Promise<string | undefined> {
  const activeRemote = remote;
  remote = undefined;
  remoteQueue = Promise.resolve({});
  if (!activeRemote) {
    return undefined;
  }
  try {
    await activeRemote.reader.cancel();
    return "Closed in-memory MCP connection and cleared its wrapped session cookie.";
  } catch (error) {
    return `Cleared in-memory MCP connection state; reader close reported: ${asError(error).message}`;
  }
}