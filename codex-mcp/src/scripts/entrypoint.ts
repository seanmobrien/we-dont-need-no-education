#!/usr/bin/env node
import { rm } from "node:fs/promises";
import { createInterface } from "node:readline";
import {
  type Token,
  writeCachedTokenFile
} from "./runtime-utils";
import {
  cachePath,
  configuredToolset,
  credentialCachePaths,
  log,
  logFilePath,
  optional,
} from "./config";
import { asError } from "./errors";
import {
  acquireToken,
  resetAuthState,
} from "./auth";
import { callNeo4jMcpTool, clearNeo4jState } from "./neo4j";
import {
  clearAppToolCaches,
} from "./app-tools";
import {
  clearRemoteState,
  remoteNotification as notifyRemote,
  remoteRequest as requestRemote,
} from "./remote";
import type {
  AnyRecord,
  CachedToken,
  JsonRpcMessage,
  JsonToolResult,
  OpenAiFunctionToolDefinition,
  OpenAiToolDefinition,
  RpcId,
  ToolArgs,
  ToolDefinition,
} from "./types";
import {
  sessionEndpointUrl,
  wrapEndpointUrl,
} from "./urls";
import {
  graphToolAliases,
} from "./helper-tool-schemas";
import { dispatchHelperTool } from "./helper-tool-dispatch";
import { objectSchema } from "./schema-utils";
import {
  helperToolIsCallable as isHelperToolCallable,
  listToolsForToolset,
  namespaceDescriptions,
  namespaceNamesForToolset,
  namespaceTools,
  remoteToolIsCallable as isRemoteToolCallable,
  unprefixedToolName,
  upstreamRemoteToolName as resolveUpstreamRemoteToolName,
} from "./tool-catalog";


function listTools(): ToolDefinition[] {
  return listToolsForToolset(configuredToolset());
}


async function freshTokenAfterBadRequest(reason: string): Promise<CachedToken> {
  log("HTTP 400 received from protected upstream; clearing cached auth and retrying once", { reason });
  try {
    await clearCachedToken();
  } catch (error) {
    log("could not clear cached token before retrying auth", { message: asError(error).message });
  }
  return acquireToken({ ignoreCache: true });
}

function sendToClient(message: AnyRecord): void {
  log("sending message to client", summarizeMessage(message));
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function errorResponse(id: RpcId | undefined, code: number, message: string): AnyRecord {
  return { jsonrpc: "2.0", id, error: { code, message } };
}



function summarizeMessage(message: AnyRecord | undefined): AnyRecord {
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

async function remoteNotification(method: string, params: ToolArgs = {}): Promise<void> {
  await notifyRemote(method, params, freshTokenAfterBadRequest);
}

function remoteRequest(method: string, params: ToolArgs = {}): Promise<AnyRecord> {
  return requestRemote(method, params, freshTokenAfterBadRequest);
}

async function callNeo4jGraphTool(name: string, args: ToolArgs = {}, retried = false): Promise<AnyRecord> {
  const upstreamName = graphToolAliases[name];
  if (!upstreamName) {
    throw new Error(`Unknown Neo4j graph tool ${name}.`);
  }
  try {
    return await callNeo4jMcpTool(upstreamName, args);
  } catch (error) {
    const message = asError(error).message;
    if (!retried && /backend exited|failed to start|EPIPE|closed/i.test(message)) {
      clearNeo4jState();
      return callNeo4jGraphTool(name, args, true);
    }
    throw error;
  }
}

function isUnsupportedMethod(error: unknown): boolean {
  return String((error as Error | undefined)?.message || "").toLowerCase().includes("method not found");
}

async function collectPaginated(method: string, keyName: string): Promise<AnyRecord[]> {
  const items: AnyRecord[] = [];
  let cursor: string | undefined;
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

function toOpenAiFunctionTool(tool: ToolDefinition): OpenAiFunctionToolDefinition {
  return {
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema || objectSchema({})
  };
}

function listOpenAiTools(): OpenAiToolDefinition[] {
  return [
    { type: "tool_search" },
    ...namespaceNamesForToolset(configuredToolset()).map((serverName) => ({
      type: "namespace" as const,
      name: serverName,
      description: namespaceDescriptions[serverName],
      tools: namespaceTools(serverName).map(toOpenAiFunctionTool)
    }))
  ];
}

function remoteToolIsCallable(name: string | undefined): boolean {
  return isRemoteToolCallable(configuredToolset(), name);
}

function upstreamRemoteToolName(name: string | undefined): string | undefined {
  return resolveUpstreamRemoteToolName(configuredToolset(), name);
}

function helperToolIsCallable(name: string | undefined): boolean {
  return isHelperToolCallable(configuredToolset(), name);
}

async function listResources(): Promise<AnyRecord[]> {
  return collectPaginated("resources/list", "resources");
}

async function listResourceTemplates(): Promise<AnyRecord[]> {
  return collectPaginated("resources/templates/list", "resourceTemplates");
}

function formatSchema(schema?: AnyRecord): string {
  return schema ? JSON.stringify(schema) : "{}";
}

function formatAbilities(tools: ToolDefinition[], resources: AnyRecord[], templates: AnyRecord[]): string {
  const lines = ["Tools:"];
  for (const tool of tools) {
    lines.push(`- ${tool.name}: ${tool.description || "No description"}`);
    lines.push(`  inputSchema: ${formatSchema(tool.inputSchema)}`);
    if (tool.outputSchema) {
      lines.push(`  outputSchema: ${formatSchema(tool.outputSchema)}`);
    }
  }
  lines.push("");
  lines.push(`Resources: ${resources.length}`);
  lines.push(`Resource templates: ${templates.length}`);
  for (const template of templates) {
    lines.push(`- ${template.uriTemplate}: ${template.name || template.description || "Template"}`);
  }
  return lines.join("\n");
}

function resourcePath(resource: AnyRecord): string {
  try {
    const parsed = new URL(resource.uri);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return resource.uri;
  }
}

function formatResourceDirectory(resources: AnyRecord[], templates: AnyRecord[]): string {
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

async function clearCachedToken(): Promise<string> {
  const messages: string[] = [];
  const remoteMessage = await clearRemoteState();
  const hadNeo4jRemote = clearNeo4jState();
  resetAuthState();
  clearAppToolCaches();
  if (remoteMessage) {
    messages.push(remoteMessage);
  } else {
    messages.push("Cleared in-memory auth/session state.");
  }
  messages.push("Cleared in-memory query vector cache.");
  if (hadNeo4jRemote) {
    messages.push("Closed in-memory Neo4j MCP backend connection.");
  }

  if (optional("DISABLE_TOKEN_CACHE") === "1") {
    messages.push("Token cache is disabled by MCP_COMPLIANCE_THEATER_RESOURCE_DISABLE_TOKEN_CACHE=1.");
    return messages.join("\n");
  }

  for (const { path, label } of credentialCachePaths()) {
    try {
      await rm(path);
      messages.push(`Removed ${label}: ${path}`);
    } catch (error) {
      if (asError(error).code === "ENOENT") {
        messages.push(`No ${label} file found at: ${path}`);
        continue;
      }
      throw error;
    }
  }

  messages.push("Wrapper-managed OAuth tokens, refresh tokens, wrapped Auth.js session tokens, and cookies are cleared.");
  return messages.join("\n");
}

async function callHelperTool(id: RpcId | undefined, name: string, args: ToolArgs = {}): Promise<void> {
  try {
    const localName = unprefixedToolName(name) || name;
    const outcome = await dispatchHelperTool(localName, args, {
      callNeo4jGraphTool,
      clearCachedToken,
      formatAbilities,
      formatResourceDirectory,
      freshTokenAfterBadRequest,
      listResourceTemplates,
      listResources,
      listTools,
      remoteRequest,
      toolset: configuredToolset(),
    });
    if ("error" in outcome) {
      sendToClient(errorResponse(id, outcome.error.code, outcome.error.message));
      return;
    }
    sendToClient({ jsonrpc: "2.0", id, result: outcome.result });
  } catch (error) {
    sendToClient(errorResponse(id, -32000, asError(error).message));
  }
}

function localInitializeResult(params: ToolArgs = {}): AnyRecord {
  return {
    protocolVersion: params.protocolVersion || "2024-11-05",
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
    serverInfo: {
      name: "compliance_theater_2000",
      version: "0.1.0"
    }
  };
}

async function handleClientRequest(message: JsonRpcMessage): Promise<void> {
  log("handling client request", summarizeMessage(message));

  if (message.method === "initialize") {
    sendToClient({ jsonrpc: "2.0", id: message.id, result: localInitializeResult(message.params) });
    return;
  }

  if (message.method === "notifications/initialized") {
    return;
  }

  if (message.method === "tools/list") {
    sendToClient({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        tools: listTools(),
        openaiTools: listOpenAiTools()
      }
    });
    return;
  }

  if (message.method === "tools/list_openai" || message.method === "tools/list/openai") {
    sendToClient({ jsonrpc: "2.0", id: message.id, result: { tools: listOpenAiTools() } });
    return;
  }

  if (message.method === "tools/call") {
    const name = message.params?.name;
    if (helperToolIsCallable(name)) {
      await callHelperTool(message.id, name, message.params?.arguments || {});
      return;
    }
    if (!remoteToolIsCallable(name)) {
      sendToClient(errorResponse(message.id, -32601, `Tool ${name || "(missing)"} is not exposed by this plugin.`));
      return;
    }
  }

  if (message.id === undefined) {
    remoteNotification(message.method, message.params || {}).catch((error) => log(`remote notification failed: ${error.message}`));
    return;
  }

  try {
    const params = message.method === "tools/call"
      ? {
        ...(message.params || {}),
        name: upstreamRemoteToolName(message.params?.name)
      }
      : (message.params || {});
    const result = await remoteRequest(message.method, params);
    sendToClient({ jsonrpc: "2.0", id: message.id, result });
  } catch (error) {
    sendToClient(errorResponse(message.id, -32000, asError(error).message));
  }
}

function bindJsonLines(
  stream: NodeJS.ReadableStream,
  onMessage: (message: JsonRpcMessage) => void,
  source: string
): void {
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
      log(`could not parse ${source} JSON message: ${asError(error).message}`);
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
        sendToClient(errorResponse(message.id, -32000, asError(error).message));
      } else {
        log(asError(error).message);
      }
    });
  }, "client");
}

main().catch((error) => {
  const startupError = asError(error);
  log("wrapper startup failed", { message: startupError.message, stack: startupError.stack });
  process.exit(1);
});
