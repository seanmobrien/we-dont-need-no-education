import type {
  AnyRecord,
  ServerName,
  ToolDefinition,
  Toolset,
} from "./types";
import { caseFileTools, coreHelperTools, searchHelperTools, utilityTools } from "./helper-tool-schemas";
import { memoryTools } from "./memory-tool-schemas";
import { staticRemoteTools } from "./remote-tool-schemas";

function displayTitle(name: string): string {
  return name
    .replace(/^mcp_resource_auth_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function withAnnotations(tools: ToolDefinition[], getAnnotations: (name: string) => AnyRecord): ToolDefinition[] {
  return tools.map((tool) => ({
    ...tool,
    annotations: {
      ...getAnnotations(tool.name),
      ...(tool.annotations || {})
    }
  }));
}

const readOnlyRemoteToolNames = new Set([
  "searchPolicyStore",
  "searchCaseFile",
  "getMultipleCaseFileDocuments",
  "getCaseFileDocumentIndex",
  "sequentialthinking",
  "getTodos",
  "getCaseWorkspace",
  "readWorkspaceFile"
]);
const idempotentRemoteToolNames = new Set([
  "searchPolicyStore",
  "searchCaseFile",
  "getMultipleCaseFileDocuments",
  "getCaseFileDocumentIndex",
  "sequentialthinking",
  "getTodos",
  "getCaseWorkspace",
  "readWorkspaceFile",
  "updateTodo",
  "updateWorkspaceTaskStatus",
  "updateWorkspaceTaskDetails",
  "upsertWorkspaceDocumentSummary",
  "updateOpenQuestionStatus"
]);

function annotationsForRemoteTool(name: string): AnyRecord {
  const readOnly = readOnlyRemoteToolNames.has(name);
  return {
    title: displayTitle(name),
    readOnlyHint: readOnly,
    destructiveHint: false,
    idempotentHint: idempotentRemoteToolNames.has(name),
    openWorldHint: false,
  };
}

function annotationsForHelperTool(name: string): AnyRecord {
  const readOnlyHelperNames = new Set([
    "read_case_file",
    "get",
    "list",
    "graph_schema",
    "graph_read",
    "categories",
    "search",
    "related"
  ]);
  const idempotentHelperNames = new Set([
    "read_case_file",
    "get",
    "embed",
    "list",
    "graph_schema",
    "graph_read",
    "categories",
    "search",
    "related",
    "update"
  ]);
  return {
    title: displayTitle(name),
    readOnlyHint: readOnlyHelperNames.has(name),
    destructiveHint: name === "graph_write" || name === "graph_embed",
    idempotentHint: idempotentHelperNames.has(name),
    openWorldHint: false
  };
}

export const serverNames: ServerName[] = [
  "compliance_theater",
  "compliance_theater_memory",
  "compliance_theater_utils",
  "compliance_theater_todo",
  "compliance_theater_case_workspace",
  "compliance_theater_search",
  "compliance_theater_case_files"
];

export function serverNameForToolset(toolset: Toolset): ServerName {
  if (toolset === "memory") {
    return "compliance_theater_memory";
  }
  if (toolset === "utils") {
    return "compliance_theater_utils";
  }
  if (toolset === "todo") {
    return "compliance_theater_todo";
  }
  if (toolset === "case-workspace") {
    return "compliance_theater_case_workspace";
  }
  if (toolset === "search") {
    return "compliance_theater_search";
  }
  if (toolset === "case-files") {
    return "compliance_theater_case_files";
  }
  return "compliance_theater";
}

export function prefixedToolName(serverName: ServerName, toolName: string): string {
  return `${serverName}_${toolName}`;
}

function serverInputPrefixes(serverName: ServerName): string[] {
  const suffix = serverName.slice("compliance_theater".length).replace(/^_/, "");
  const suffixVariants = suffix ? [suffix, suffix.replace(/_/g, "-")] : [""];
  const baseVariants = ["compliance_theater", "compliance-theater"];
  const prefixes = new Set<string>();
  for (const base of baseVariants) {
    for (const suffixVariant of suffixVariants) {
      prefixes.add(`${base}${suffixVariant ? `_${suffixVariant}` : ""}_`);
      prefixes.add(`${base}${suffixVariant ? `-${suffixVariant}` : ""}_`);
    }
  }
  return [...prefixes];
}

export function unprefixedToolName(toolName: string | undefined): string | undefined {
  if (!toolName) {
    return undefined;
  }
  const prefix = serverNames
    .flatMap(serverInputPrefixes)
    .sort((left, right) => right.length - left.length)
    .find((inputPrefix) => toolName.startsWith(inputPrefix));
  if (prefix) {
    return toolName.slice(prefix.length);
  }
  return toolName;
}

export function prefixToolDefinitions(tools: ToolDefinition[], serverName: ServerName): ToolDefinition[] {
  return tools.map((tool) => {
    const name = prefixedToolName(serverName, tool.name);
    const definition: ToolDefinition = {
      ...tool,
      name,
      description: `${tool.description || "No description"} Exposed as ${name}.`,
      annotations: {
        ...tool.annotations,
        title: displayTitle(name)
      }
    };
    return definition;
  });
}

export const namespaceDescriptions: Record<ServerName, string> = {
  compliance_theater: "Default Compliance Theater tools for general education compliance reasoning and structured case analysis.",
  compliance_theater_memory: "Compliance Theater memory tools for listing, creating, retrieving, updating, searching, and relating persisted investigation memories.",
  compliance_theater_utils: "Compliance Theater utility tools for authenticated app API calls, auth/session management, and ability/resource listings.",
  compliance_theater_todo: "Compliance Theater todo tools for creating, reading, updating, and advancing compliance-oriented task lists.",
  compliance_theater_case_workspace: "Compliance Theater case workspace tools for summaries, workspace files, tasks, document summaries, open questions, session logs, and compaction.",
  compliance_theater_search: "Compliance Theater search tools for policy search, case-file evidence search, document indexes, embeddings, and Neo4j graph queries.",
  compliance_theater_case_files: "Compliance Theater case-file tools for direct full-fidelity reads, goal-based retrieval, and structured case-file amendments."
};

const exposedRemoteTools = withAnnotations(staticRemoteTools, annotationsForRemoteTool);
const remoteToolNames = new Set(exposedRemoteTools.map((tool) => tool.name));
const caseFileToolNames = new Set(["getMultipleCaseFileDocuments", "amendCaseFileDocument"]);
const searchToolNames = new Set(["searchPolicyStore", "searchCaseFile", "getCaseFileDocumentIndex"]);
const todoToolNames = new Set(["createTodo", "getTodos", "updateTodo", "toggleTodo"]);
const caseWorkspaceToolNames = new Set([
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
const searchRemoteToolAliases: Record<string, string> = {
  policy: "searchPolicyStore",
  case_file: "searchCaseFile",
  index: "getCaseFileDocumentIndex"
};
const todoRemoteToolAliases: Record<string, string> = {
  insert: "createTodo",
  get: "getTodos",
  update: "updateTodo",
  toggle: "toggleTodo"
};
const caseWorkspaceRemoteToolAliases: Record<string, string> = {
  get: "getCaseWorkspace",
  read: "readWorkspaceFile",
  append_task: "appendWorkspaceTask",
  update_status: "updateWorkspaceTaskStatus",
  update_details: "updateWorkspaceTaskDetails",
  upsert: "upsertWorkspaceDocumentSummary",
  insert_question: "addOpenQuestion",
  update_question: "updateOpenQuestionStatus",
  log: "appendWorkspaceSessionLog",
  compact: "compactWorkspace"
};

function aliasedRemoteTools(tools: ToolDefinition[], toolNames: Set<string>, aliases: Record<string, string>): ToolDefinition[] {
  const publicNameByUpstreamName = new Map(Object.entries(aliases).map(([publicName, upstreamName]) => [upstreamName, publicName]));
  return tools
    .filter((tool) => toolNames.has(tool.name))
    .map((tool) => {
      const name = publicNameByUpstreamName.get(tool.name) || tool.name;
      return {
        ...tool,
        name,
        annotations: {
          ...tool.annotations,
          title: displayTitle(name)
        }
      };
    });
}

const exposedSearchTools = aliasedRemoteTools(exposedRemoteTools, searchToolNames, searchRemoteToolAliases);
const exposedTodoTools = aliasedRemoteTools(exposedRemoteTools, todoToolNames, todoRemoteToolAliases);
const exposedCaseWorkspaceTools = aliasedRemoteTools(exposedRemoteTools, caseWorkspaceToolNames, caseWorkspaceRemoteToolAliases);
const exposedDefaultRemoteTools = exposedRemoteTools.filter(
  (tool) =>
    !caseFileToolNames.has(tool.name) &&
    !searchToolNames.has(tool.name) &&
    !todoToolNames.has(tool.name) &&
    !caseWorkspaceToolNames.has(tool.name)
);
const helperTools: ToolDefinition[] = [...coreHelperTools, ...caseFileTools, ...searchHelperTools, ...utilityTools, ...memoryTools];
const exposedHelperTools = withAnnotations(helperTools, annotationsForHelperTool);
const exposedCoreHelperTools = withAnnotations(
  coreHelperTools.filter((tool) => tool.name !== "read_case_file"),
  annotationsForHelperTool
);
const exposedCaseFileTools = withAnnotations(caseFileTools, annotationsForHelperTool);
const exposedSearchHelperTools = withAnnotations(searchHelperTools, annotationsForHelperTool);
const exposedUtilityTools = withAnnotations(utilityTools, annotationsForHelperTool);
const exposedMemoryTools = withAnnotations(memoryTools, annotationsForHelperTool);

export function exposedHelperToolsForToolset(toolset: Toolset): ToolDefinition[] {
  if (toolset === "memory") {
    return exposedMemoryTools;
  }
  if (toolset === "utils") {
    return exposedUtilityTools;
  }
  if (toolset === "todo") {
    return [];
  }
  if (toolset === "case-workspace") {
    return [];
  }
  if (toolset === "search") {
    return exposedSearchHelperTools;
  }
  if (toolset === "case-files") {
    return exposedCaseFileTools;
  }
  if (toolset === "default") {
    return exposedCoreHelperTools;
  }
  return exposedHelperTools;
}

export function listToolsForToolset(toolset: Toolset): ToolDefinition[] {
  if (toolset === "memory") {
    return prefixToolDefinitions(exposedMemoryTools, serverNameForToolset(toolset));
  }
  if (toolset === "utils") {
    return prefixToolDefinitions(exposedUtilityTools, serverNameForToolset(toolset));
  }
  if (toolset === "todo") {
    return prefixToolDefinitions(exposedTodoTools, serverNameForToolset(toolset));
  }
  if (toolset === "case-workspace") {
    return prefixToolDefinitions(exposedCaseWorkspaceTools, serverNameForToolset(toolset));
  }
  if (toolset === "search") {
    return prefixToolDefinitions([...exposedSearchTools, ...exposedSearchHelperTools], serverNameForToolset(toolset));
  }
  if (toolset === "case-files") {
    return prefixToolDefinitions(exposedCaseFileTools, serverNameForToolset(toolset));
  }
  if (toolset === "default") {
    return prefixToolDefinitions([...exposedDefaultRemoteTools, ...exposedCoreHelperTools], serverNameForToolset(toolset));
  }
  return [
    ...prefixToolDefinitions(exposedDefaultRemoteTools, "compliance_theater"),
    ...prefixToolDefinitions(exposedCoreHelperTools, "compliance_theater"),
    ...prefixToolDefinitions(exposedMemoryTools, "compliance_theater_memory"),
    ...prefixToolDefinitions(exposedUtilityTools, "compliance_theater_utils"),
    ...prefixToolDefinitions(exposedTodoTools, "compliance_theater_todo"),
    ...prefixToolDefinitions(exposedCaseWorkspaceTools, "compliance_theater_case_workspace"),
    ...prefixToolDefinitions([...exposedSearchTools, ...exposedSearchHelperTools], "compliance_theater_search"),
    ...prefixToolDefinitions(exposedCaseFileTools, "compliance_theater_case_files")
  ];
}

export function namespaceTools(serverName: ServerName): ToolDefinition[] {
  if (serverName === "compliance_theater_memory") {
    return exposedMemoryTools;
  }
  if (serverName === "compliance_theater_utils") {
    return exposedUtilityTools;
  }
  if (serverName === "compliance_theater_todo") {
    return exposedTodoTools;
  }
  if (serverName === "compliance_theater_case_workspace") {
    return exposedCaseWorkspaceTools;
  }
  if (serverName === "compliance_theater_search") {
    return [...exposedSearchTools, ...exposedSearchHelperTools];
  }
  if (serverName === "compliance_theater_case_files") {
    return exposedCaseFileTools;
  }
  return [...exposedDefaultRemoteTools, ...exposedCoreHelperTools];
}

export function namespaceNamesForToolset(toolset: Toolset): ServerName[] {
  if (toolset === "all") {
    return serverNames;
  }
  return [serverNameForToolset(toolset)];
}

export function remoteToolIsCallable(toolset: Toolset, name: string | undefined): boolean {
  const localName = unprefixedToolName(name);
  if (!localName || toolset === "memory" || toolset === "utils") {
    return false;
  }
  if (toolset === "todo") {
    return Object.prototype.hasOwnProperty.call(todoRemoteToolAliases, localName);
  }
  if (toolset === "case-workspace") {
    return Object.prototype.hasOwnProperty.call(caseWorkspaceRemoteToolAliases, localName);
  }
  if (toolset === "search") {
    return Object.prototype.hasOwnProperty.call(searchRemoteToolAliases, localName);
  }
  if (toolset === "case-files") {
    return false;
  }
  if (toolset === "default") {
    return remoteToolNames.has(localName) && !searchToolNames.has(localName) && !todoToolNames.has(localName) && !caseWorkspaceToolNames.has(localName);
  }
  return remoteToolNames.has(localName);
}

export function upstreamRemoteToolName(toolset: Toolset, name: string | undefined): string | undefined {
  const localName = unprefixedToolName(name);
  if (!localName) {
    return undefined;
  }
  if (toolset === "todo") {
    return todoRemoteToolAliases[localName] || localName;
  }
  if (toolset === "case-workspace") {
    return caseWorkspaceRemoteToolAliases[localName] || localName;
  }
  if (toolset === "search") {
    return searchRemoteToolAliases[localName] || localName;
  }
  return localName;
}

export function helperToolIsCallable(toolset: Toolset, name: string | undefined): boolean {
  const localName = unprefixedToolName(name);
  return Boolean(localName && exposedHelperToolsForToolset(toolset).some((tool) => tool.name === localName));
}
