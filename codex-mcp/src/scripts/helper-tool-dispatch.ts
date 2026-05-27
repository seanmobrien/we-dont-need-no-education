import {
  amendCaseFileTool,
  callApiTool,
  callMemoryTool,
  createGenerateQueryVectors,
  getCaseFileTool,
  manageCaseFileEmbeddingsTool,
  readCaseFileTool,
} from "./app-tools";
import {
  authStatusSummary,
  loginAndSummarizeStatus,
} from "./auth";
import { graphEmbedTool } from "./graph-embed";
import { graphToolAliases } from "./helper-tool-schemas";
import { memoryTools } from "./memory-tool-schemas";
import type {
  AnyRecord,
  CachedToken,
  JsonToolResult,
  ToolArgs,
  ToolDefinition,
  Toolset,
} from "./types";
import { materializeGraphVectorParams } from "./vector-params";

function textToolResult(text: string): JsonToolResult {
  return { content: [{ type: "text", text }] };
}

function jsonToolResult(value: unknown): JsonToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: { result: value }
  };
}

export type HelperToolDispatchDeps = {
  callNeo4jGraphTool: (name: string, args?: ToolArgs) => Promise<AnyRecord>;
  clearCachedToken: () => Promise<string>;
  formatAbilities: (tools: ToolDefinition[], resources: AnyRecord[], templates: AnyRecord[]) => string;
  formatResourceDirectory: (resources: AnyRecord[], templates: AnyRecord[]) => string;
  freshTokenAfterBadRequest: (reason: string) => Promise<CachedToken>;
  listResourceTemplates: () => Promise<AnyRecord[]>;
  listResources: () => Promise<AnyRecord[]>;
  listTools: () => ToolDefinition[];
  remoteRequest: (method: string, params?: ToolArgs) => Promise<AnyRecord>;
  toolset: Toolset;
};

export type HelperToolDispatchResult =
  | { result: JsonToolResult | AnyRecord }
  | { error: { code: number; message: string } };

export async function dispatchHelperTool(
  localName: string,
  args: ToolArgs = {},
  deps: HelperToolDispatchDeps,
): Promise<HelperToolDispatchResult> {
  const {
    callNeo4jGraphTool,
    clearCachedToken,
    formatAbilities,
    formatResourceDirectory,
    freshTokenAfterBadRequest,
    listResourceTemplates,
    listResources,
    listTools,
    remoteRequest,
    toolset,
  } = deps;

  if (toolset === "memory" && memoryTools.some((tool) => tool.name === localName)) {
    return { result: jsonToolResult(await callMemoryTool(localName, args, freshTokenAfterBadRequest)) };
  }

  if (localName === "read_case_file") {
    return { result: jsonToolResult(await readCaseFileTool(args, freshTokenAfterBadRequest)) };
  }

  if (localName === "get") {
    return { result: jsonToolResult(await getCaseFileTool(args, remoteRequest, freshTokenAfterBadRequest)) };
  }

  if (localName === "amend") {
    return { result: jsonToolResult(await amendCaseFileTool(args, remoteRequest)) };
  }

  if (localName === "embed") {
    return { result: jsonToolResult(await manageCaseFileEmbeddingsTool(args, freshTokenAfterBadRequest)) };
  }

  if (localName === "graph_embed") {
    const generateQueryVectors = createGenerateQueryVectors(freshTokenAfterBadRequest);
    return {
      result: jsonToolResult(await graphEmbedTool(args, callNeo4jGraphTool, generateQueryVectors))
    };
  }

  if (localName in graphToolAliases) {
    const generateQueryVectors = createGenerateQueryVectors(freshTokenAfterBadRequest);
    const graphArgs = localName === "graph_read" || localName === "graph_write"
      ? await materializeGraphVectorParams(args, generateQueryVectors)
      : args;
    return { result: await callNeo4jGraphTool(localName, graphArgs) };
  }

  if (localName === "call_api") {
    return { result: jsonToolResult(await callApiTool(args, freshTokenAfterBadRequest)) };
  }

  if (toolset !== "utils" && memoryTools.some((tool) => tool.name === localName)) {
    return { result: jsonToolResult(await callMemoryTool(localName, args, freshTokenAfterBadRequest)) };
  }

  if (localName === "list") {
    const listType = args.type ?? "abilities";
    if (listType === "abilities") {
      const [tools, resources, templates] = await Promise.all([
        Promise.resolve(listTools()),
        listResources().catch(() => []),
        listResourceTemplates().catch(() => [])
      ]);
      return { result: textToolResult(formatAbilities(tools, resources, templates)) };
    }
    if (listType === "resources") {
      const [resources, templates] = await Promise.all([
        listResources().catch(() => []),
        listResourceTemplates().catch(() => [])
      ]);
      return { result: textToolResult(formatResourceDirectory(resources, templates)) };
    }
    return { error: { code: -32602, message: "type must be one of: abilities, resources" } };
  }

  if (localName === "auth") {
    if (args?.action === "clear-cache") {
      return { result: textToolResult(await clearCachedToken()) };
    }
    if (args?.action === "status") {
      return { result: textToolResult(await authStatusSummary()) };
    }
    if (args?.action === "login") {
      return { result: textToolResult(await loginAndSummarizeStatus()) };
    }
    return { error: { code: -32602, message: "action must be one of: status, clear-cache, login" } };
  }

  return { error: { code: -32601, message: `Unknown helper tool ${localName}` } };
}
