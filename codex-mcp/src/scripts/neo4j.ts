import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomInt } from "node:crypto";
import { acquireAppSession, acquireToken } from "./auth";
import {
  httpRetryBaseMs,
  httpRetryCount,
  httpTimeoutMs,
  log,
  neo4jCredentialCachePath,
  proxyRequestTimeoutMs,
  tokenSkewMs,
} from "./config";
import { asError } from "./errors";
import { fetchJsonResponse } from "./http";
import { appSessionCookieHeader, fetchWithPolicy, tokenExpiresAt } from "./runtime-utils";
import { appEndpointUrl } from "./urls";
import type {
  AnyRecord,
  CachedNeo4jSettings,
  Neo4jSettings,
  StdioMcpConnection,
  ToolArgs,
} from "./types";

let neo4jRemote: StdioMcpConnection | undefined;
let neo4jSettingsCache: Neo4jSettings | undefined;
let neo4jAutoDiscoveryAttempted = false;

function neo4jSetting(name: string): string | undefined {
  const value = process.env[`MCP_COMPLIANCE_THEATER_NEO4J_${name}`];
  if (!value || value.startsWith("[TODO:")) {
    return undefined;
  }
  return value;
}

function neo4jAutoDiscoveryEnabled(): boolean {
  const value = process.env.MCP_COMPLIANCE_THEATER_NEO4J_AUTO_DISCOVERY;
  if (value === undefined || value === "" || value.startsWith("[TODO:")) {
    return true;
  }
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

function completeNeo4jSettings(values: Partial<Neo4jSettings>): Neo4jSettings | undefined {
  if (values.URI && values.USERNAME && values.PASSWORD && values.DATABASE) {
    return values as Neo4jSettings;
  }
  return undefined;
}

function configuredNeo4jSettings(): Partial<Neo4jSettings> {
  return {
    URI: neo4jSetting("URI"),
    USERNAME: neo4jSetting("USERNAME"),
    PASSWORD: neo4jSetting("PASSWORD"),
    DATABASE: neo4jSetting("DATABASE")
  };
}

function discoveredNeo4jSettings(config: AnyRecord): Neo4jSettings | undefined {
  const graphConfig = config?.mem0?.graph_store?.config;
  if (!graphConfig || typeof graphConfig !== "object") {
    return undefined;
  }
  const values = {
    URI: graphConfig.url,
    USERNAME: graphConfig.username,
    PASSWORD: graphConfig.password,
    DATABASE: graphConfig.database
  };
  if (Object.values(values).some((value) => typeof value !== "string" || value.trim() === "" || value.startsWith("env:"))) {
    return undefined;
  }
  return values as Neo4jSettings;
}

async function readCachedNeo4jSettings(): Promise<Neo4jSettings | undefined> {
  try {
    const cached = JSON.parse(await readFile(neo4jCredentialCachePath(), "utf8")) as CachedNeo4jSettings;
    if (cached.expires_at && cached.expires_at > Date.now() + tokenSkewMs()) {
      const settings = completeNeo4jSettings(cached);
      if (settings) {
        log("using cached Neo4j graph credentials", { expiresAt: new Date(cached.expires_at).toISOString() });
        return settings;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function writeCachedNeo4jSettings(settings: Neo4jSettings, expiresAt: number): Promise<void> {
  const path = neo4jCredentialCachePath();
  mkdirSync(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({
    ...settings,
    expires_at: expiresAt,
    expires_at_iso: new Date(expiresAt).toISOString()
  }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  log("cached discovered Neo4j graph credentials", { expiresAt: new Date(expiresAt).toISOString() });
}

async function appSessionJsonRequest(method: string, url: string, body?: unknown): Promise<AnyRecord> {
  const token = await acquireToken();
  const result = await appSessionJsonRequestWithToken(token, method, url, body);
  return result.body;
}

async function appSessionJsonRequestWithToken(
  token: Awaited<ReturnType<typeof acquireToken>>,
  method: string,
  url: string,
  body?: unknown
): Promise<{ response: Response; body: AnyRecord; url: string }> {
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
    throw new Error(`App API ${method} ${url} failed: ${detail}`);
  }
  return responseResult;
}

async function discoverNeo4jSettings(): Promise<Neo4jSettings | undefined> {
  if (neo4jAutoDiscoveryAttempted) {
    return undefined;
  }
  neo4jAutoDiscoveryAttempted = true;
  try {
    const config = await appSessionJsonRequest("GET", appEndpointUrl("/api/memory/config", { secrets: true }));
    const settings = discoveredNeo4jSettings(config);
    if (!settings) {
      log("Neo4j graph credential discovery returned no concrete graph_store credentials");
      return undefined;
    }
    const token = await acquireToken();
    await writeCachedNeo4jSettings(settings, tokenExpiresAt(token, 0));
    return settings;
  } catch (error) {
    log("Neo4j graph credential discovery failed; falling back to plugin settings", { message: asError(error).message });
    return undefined;
  }
}

async function resolvedNeo4jSettings(): Promise<Neo4jSettings> {
  if (neo4jSettingsCache) {
    return neo4jSettingsCache;
  }
  if (neo4jAutoDiscoveryEnabled()) {
    const cached = await readCachedNeo4jSettings();
    if (cached) {
      neo4jSettingsCache = cached;
      return cached;
    }
    const discovered = await discoverNeo4jSettings();
    if (discovered) {
      neo4jSettingsCache = discovered;
      return discovered;
    }
  }
  const configured = completeNeo4jSettings(configuredNeo4jSettings());
  if (configured) {
    neo4jSettingsCache = configured;
    return configured;
  }

  const requiredSettings = ["URI", "USERNAME", "PASSWORD", "DATABASE"];
  const pluginSettingNames: Record<string, string> = {
    URI: "neo4jUri",
    USERNAME: "neo4jUsername",
    PASSWORD: "neo4jPassword",
    DATABASE: "neo4jDatabase"
  };
  const missing = requiredSettings.filter((name) => {
    const value = configuredNeo4jSettings()[name as keyof Neo4jSettings];
    return !value;
  });
  throw new Error(`Neo4j graph tools are not configured. Missing plugin settings: ${missing.map((name) => pluginSettingNames[name]).join(", ")}.`);
}

async function neo4jChildEnv(): Promise<NodeJS.ProcessEnv> {
  const settings = await resolvedNeo4jSettings();
  return {
    ...process.env,
    NEO4J_URI: settings.URI,
    NEO4J_USERNAME: settings.USERNAME,
    NEO4J_PASSWORD: settings.PASSWORD,
    NEO4J_DATABASE: settings.DATABASE,
    NEO4J_READ_ONLY: "false",
    NEO4J_TELEMETRY: "false"
  };
}

function writeStdioMcpMessage(connection: StdioMcpConnection, message: AnyRecord): void {
  const body = JSON.stringify(message);
  if (connection.outputFraming === "newline") {
    connection.child.stdin.write(`${body}\n`);
    return;
  }
  const header = `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n`;
  connection.child.stdin.write(header + body);
}

function rejectPendingStdioRequests(connection: StdioMcpConnection, error: Error): void {
  for (const pending of connection.pending.values()) {
    clearTimeout(pending.timer);
    pending.reject(error);
  }
  connection.pending.clear();
}

function handleStdioMcpMessage(connection: StdioMcpConnection, message: AnyRecord): void {
  if (typeof message.id !== "number") {
    return;
  }
  const pending = connection.pending.get(message.id);
  if (!pending) {
    return;
  }
  clearTimeout(pending.timer);
  connection.pending.delete(message.id);
  if (message.error) {
    const detail = message.error.message || JSON.stringify(message.error);
    pending.reject(new Error(`Neo4j MCP ${connection.commandLabel} request failed: ${detail}`));
    return;
  }
  pending.resolve(message.result || {});
}

function parseStdioMcpBuffer(connection: StdioMcpConnection): void {
  while (connection.buffer.length > 0) {
    const headerEnd = connection.buffer.indexOf("\r\n\r\n");
    if (headerEnd >= 0) {
      const header = connection.buffer.subarray(0, headerEnd).toString("utf8");
      const match = /content-length:\s*(\d+)/i.exec(header);
      if (!match) {
        connection.buffer = Buffer.alloc(0);
        throw new Error("Neo4j MCP backend returned an invalid stdio frame.");
      }
      const contentLength = Number(match[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;
      if (connection.buffer.length < bodyEnd) {
        return;
      }
      const body = connection.buffer.subarray(bodyStart, bodyEnd).toString("utf8");
      connection.buffer = connection.buffer.subarray(bodyEnd);
      handleStdioMcpMessage(connection, JSON.parse(body));
      continue;
    }

    const lineEnd = connection.buffer.indexOf("\n");
    if (lineEnd < 0) {
      return;
    }
    const line = connection.buffer.subarray(0, lineEnd).toString("utf8").trim();
    connection.buffer = connection.buffer.subarray(lineEnd + 1);
    if (line) {
      handleStdioMcpMessage(connection, JSON.parse(line));
    }
  }
}

function rawStdioMcpRequest(
  connection: StdioMcpConnection,
  method: string,
  params: ToolArgs = {},
  timeoutMs = proxyRequestTimeoutMs()
): Promise<AnyRecord> {
  const id = connection.nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      connection.pending.delete(id);
      reject(new Error(`Neo4j MCP backend timed out while handling ${method}.`));
    }, timeoutMs);
    connection.pending.set(id, { resolve, reject, timer });
    try {
      writeStdioMcpMessage(connection, { jsonrpc: "2.0", id, method, params });
    } catch (error) {
      clearTimeout(timer);
      connection.pending.delete(id);
      reject(asError(error));
    }
  });
}

async function stdioMcpRequest(connection: StdioMcpConnection, method: string, params: ToolArgs = {}): Promise<AnyRecord> {
  connection.queue = connection.queue.catch(() => ({})).then(() => rawStdioMcpRequest(connection, method, params));
  return connection.queue;
}

async function startNeo4jMcpCandidate(
  command: string,
  args: string[],
  commandLabel: string,
  outputFraming: StdioMcpConnection["outputFraming"]
): Promise<StdioMcpConnection> {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: await neo4jChildEnv(),
    stdio: "pipe",
    windowsHide: true
  });
  const connection: StdioMcpConnection = {
    child: child as ChildProcessWithoutNullStreams,
    commandLabel,
    outputFraming,
    nextId: randomInt(100_000, 999_999),
    buffer: Buffer.alloc(0),
    pending: new Map(),
    queue: Promise.resolve({})
  };

  child.stdout.on("data", (chunk: Buffer) => {
    try {
      connection.buffer = Buffer.concat([connection.buffer, chunk]);
      parseStdioMcpBuffer(connection);
    } catch (error) {
      rejectPendingStdioRequests(connection, asError(error));
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    const text = chunk.trim();
    if (text) {
      log(`Neo4j MCP backend stderr (${commandLabel}): ${text.slice(0, 1000)}`);
    }
  });
  child.on("error", (error) => {
    rejectPendingStdioRequests(connection, new Error(`Neo4j MCP backend failed to start with ${commandLabel}: ${error.message}`));
  });
  child.on("exit", (code, signal) => {
    if (neo4jRemote === connection) {
      neo4jRemote = undefined;
    }
    rejectPendingStdioRequests(connection, new Error(`Neo4j MCP backend exited while using ${commandLabel} (code ${code ?? "unknown"}, signal ${signal ?? "none"}).`));
  });

  log("starting Neo4j MCP backend", { commandLabel, outputFraming });
  try {
    await rawStdioMcpRequest(connection, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "compliance_theater_neo4j_bridge", version: "0.1.0" }
    }, 15_000);
    writeStdioMcpMessage(connection, { jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    log("Neo4j MCP backend initialized", { commandLabel, outputFraming });
    return connection;
  } catch (error) {
    connection.child.kill();
    throw error;
  }
}

async function connectNeo4jMcp(): Promise<StdioMcpConnection> {
  if (neo4jRemote) {
    return neo4jRemote;
  }
  await resolvedNeo4jSettings();
  const attempts: Array<{
    command: string;
    args: string[];
    label: string;
    outputFraming: StdioMcpConnection["outputFraming"];
  }> = [
    { command: "python", args: ["-m", "neo4j_mcp_server"], label: "python -m neo4j_mcp_server", outputFraming: "newline" },
    { command: "python", args: ["-m", "neo4j_mcp_server"], label: "python -m neo4j_mcp_server", outputFraming: "content-length" },
    { command: "uvx", args: ["neo4j-mcp-server"], label: "uvx neo4j-mcp-server", outputFraming: "newline" },
    { command: "uvx", args: ["neo4j-mcp-server"], label: "uvx neo4j-mcp-server", outputFraming: "content-length" }
  ];
  const failures: string[] = [];
  for (const attempt of attempts) {
    try {
      neo4jRemote = await startNeo4jMcpCandidate(attempt.command, attempt.args, attempt.label, attempt.outputFraming);
      return neo4jRemote;
    } catch (error) {
      failures.push(`${attempt.label} (${attempt.outputFraming}): ${asError(error).message}`);
      if (neo4jRemote) {
        neo4jRemote.child.kill();
        neo4jRemote = undefined;
      }
    }
  }
  throw new Error(`Neo4j MCP backend could not be started. Tried python -m neo4j_mcp_server and uvx neo4j-mcp-server with newline and Content-Length framing. Details: ${failures.join(" | ")}`);
}

export async function callNeo4jMcpTool(upstreamName: string, args: ToolArgs = {}, retried = false): Promise<AnyRecord> {
  const connection = await connectNeo4jMcp();
  try {
    return await stdioMcpRequest(connection, "tools/call", {
      name: upstreamName,
      arguments: args
    });
  } catch (error) {
    const message = asError(error).message;
    if (!retried && /backend exited|failed to start|EPIPE|closed/i.test(message)) {
      neo4jRemote = undefined;
      return callNeo4jMcpTool(upstreamName, args, true);
    }
    throw error;
  }
}

export function clearNeo4jState(): boolean {
  const activeNeo4jRemote = neo4jRemote;
  neo4jRemote = undefined;
  neo4jSettingsCache = undefined;
  neo4jAutoDiscoveryAttempted = false;
  if (activeNeo4jRemote) {
    activeNeo4jRemote.child.kill();
    return true;
  }
  return false;
}