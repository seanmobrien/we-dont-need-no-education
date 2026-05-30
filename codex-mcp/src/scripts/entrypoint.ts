#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import {
  type AppSession,
  type Token,
  appSessionCookieHeader,
  fetchWithPolicy,
  parseNumber,
  tokenExpiresAt,
  writeCachedTokenFile
} from "./runtime-utils";
import {
  cachePath,
  configuredToolset,
  credentialCachePaths,
  embeddingCacheMaxEntries,
  embeddingCacheTtlMs,
  httpRetryBaseMs,
  httpRetryCount,
  httpTimeoutMs,
  log,
  logFilePath,
  neo4jCredentialCachePath,
  optional,
  proxyRequestTimeoutMs,
  required,
  tokenSkewMs,
} from "./config";
import { asError, httpStatusError, httpStatusFromError, isHttpBadRequest } from "./errors";
import {
  acquireAppSession,
  acquireToken,
  authStatusSummary,
  loginAndSummarizeStatus,
  resetAuthState,
} from "./auth";
import { callNeo4jMcpTool, clearNeo4jState } from "./neo4j";
import {
  amendCaseFileTool,
  callApiTool,
  callMemoryTool,
  clearAppToolCaches,
  createGenerateQueryVectors,
  getCaseFileTool,
  manageCaseFileEmbeddingsTool,
  readCaseFileTool,
} from "./app-tools";
import {
  clearRemoteState,
  remoteNotification as notifyRemote,
  remoteRequest as requestRemote,
} from "./remote";
import type {
  AnyRecord,
  CachedToken,
  EmbeddingAction,
  ErrorWithCode,
  JsonRpcMessage,
  JsonToolResult,
  OpenAiFunctionToolDefinition,
  OpenAiNamespaceToolDefinition,
  RpcId,
  ServerName,
  ToolArgs,
  ToolDefinition,
  Toolset,
} from "./types";
import {
  aiEmbedEndpointPath,
  aiEmbedEndpointUrl,
  appEndpointUrl,
  documentUnitEmbeddingsEndpointPath,
  documentUnitEmbeddingsEndpointUrl,
  documentUnitEndpointUrl,
  memoryEndpointUrl,
  sessionEndpointUrl,
  wrapEndpointUrl,
} from "./urls";
import { fetchJson, fetchJsonResponse } from "./http";
import { listLocalFileResources, readLocalFileResource } from "./local-file-resources";
import {
  materializeGraphVectorParams,
} from "./vector-params";

const env = process.env;

const searchOptionsSchema = {
  type: "object",
  properties: {
    hitsPerPage: { type: "integer", minimum: 1, maximum: 25, description: "Results per page." },
    page: { type: "integer", minimum: 1, description: "Page number." },
    metadata: { type: "object", additionalProperties: { type: "string" }, description: "Metadata filters." },
    count: { type: "boolean", description: "Return total result count." },
    continuationToken: { type: "string", description: "Pagination token." },
    exhaustive: { type: "boolean", description: "Use exhaustive search." }
  },
  additionalProperties: true
};
const caseFileScopes = ["email", "attachment", "core-document", "key-point", "call-to-action", "responsive-action", "note"];
const policyScopes = ["school-district", "state", "federal"];
const workspaceFiles = ["overview", "tasks", "documentSummaries", "openQuestions", "timelineNotes", "sessionLog", "metadata"];
const taskStatuses = ["inbox", "ready", "in_progress", "blocked", "done", "deferred"];
const taskPriorities = ["low", "medium", "high", "urgent"];
const taskOwners = ["model", "user", "system"];
const questionStatuses = ["open", "investigating", "resolved", "deferred"];
const questionTypes = ["factual", "legal", "evidentiary", "process"];
function objectSchema(properties: AnyRecord, required: string[] = [], additionalProperties = false): AnyRecord {
  return { type: "object", properties, required, additionalProperties };
}

function arrayOf(items: AnyRecord): AnyRecord {
  return { type: "array", items };
}

const stringOrNumberSchema = {
  anyOf: [{ type: "string" }, { type: "number" }]
};

function displayTitle(name: string): string {
  return name
    .replace(/^mcp_resource_auth_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

function withAnnotations(tools: ToolDefinition[], getAnnotations: (name: string) => AnyRecord): ToolDefinition[] {
  return tools.map((tool) => ({
    ...tool,
    annotations: {
      ...getAnnotations(tool.name),
      ...(tool.annotations || {})
    }
  }));
}

const serverNames: ServerName[] = [
  "compliance_theater",
  "compliance_theater_memory",
  "compliance_theater_utils",
  "compliance_theater_todo",
  "compliance_theater_case_workspace",
  "compliance_theater_search",
  "compliance_theater_case_files"
];

function serverNameForToolset(toolset: Toolset): ServerName {
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

function prefixedToolName(serverName: ServerName, toolName: string): string {
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

function unprefixedToolName(toolName: string | undefined): string | undefined {
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

function prefixToolDefinitions(tools: ToolDefinition[], serverName: ServerName): ToolDefinition[] {
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

const namespaceDescriptions: Record<ServerName, string> = {
  compliance_theater: "Default Compliance Theater tools for general education compliance reasoning and structured case analysis.",
  compliance_theater_memory: "Compliance Theater memory tools for listing, creating, retrieving, updating, searching, and relating persisted investigation memories.",
  compliance_theater_utils: "Compliance Theater utility tools for authenticated app API calls, auth/session management, and ability/resource listings.",
  compliance_theater_todo: "Compliance Theater todo tools for creating, reading, updating, and advancing compliance-oriented task lists.",
  compliance_theater_case_workspace: "Compliance Theater case workspace tools for summaries, workspace files, tasks, document summaries, open questions, session logs, and compaction.",
  compliance_theater_search: "Compliance Theater search tools for policy search, case-file evidence search, document indexes, embeddings, and Neo4j graph queries.",
  compliance_theater_case_files: "Compliance Theater case-file tools for direct full-fidelity reads, goal-based retrieval, and structured case-file amendments."
};

const staticRemoteTools: ToolDefinition[] = [
  {
    name: "searchPolicyStore",
    description: "Search Compliance Theater policy sources with hybrid/vector search.",
    inputSchema: objectSchema({
      query: { type: "string", description: "The policy search query." },
      options: {
        ...searchOptionsSchema,
        properties: {
          ...searchOptionsSchema.properties,
          scope: { type: "array", items: { type: "string", enum: policyScopes }, description: "Policy scope filter." }
        }
      }
    }, ["query"])
  },
  {
    name: "searchCaseFile",
    description: "Search Compliance Theater case-file evidence with specialized case metadata and vector search.",
    inputSchema: objectSchema({
      query: { type: "string", description: "The case-file search query." },
      options: {
        ...searchOptionsSchema,
        properties: {
          ...searchOptionsSchema.properties,
          scope: { type: "array", items: { type: "string", enum: caseFileScopes }, description: "Case-file scope filter." },
          emailId: { type: "string", description: "Filter by email ID." },
          threadId: { type: "string", description: "Filter by thread ID." },
          attachmentId: { type: "number", description: "Filter by attachment ID." },
          documentId: { type: "number", description: "Filter by document ID." },
          replyToDocumentId: { type: "number", description: "Filter by direct reply document ID." },
          relatedToDocumentId: { type: "number", description: "Filter by related document ID." }
        }
      }
    }, ["query"])
  },
  {
    name: "getMultipleCaseFileDocuments",
    description: "Retrieve and optionally summarize one or more case-file documents by ID.",
    inputSchema: objectSchema({
      requests: arrayOf(objectSchema({
        caseFileId: { ...stringOrNumberSchema, description: "Case-file document ID to retrieve." },
        goals: { type: "array", items: { type: "string" }, description: "Document-specific extraction or summary goals." },
        verbatimFidelity: { type: "number", minimum: 1, maximum: 100, description: "Document-specific fidelity override." }
      }, ["caseFileId"])),
      goals: { type: "array", items: { type: "string" }, description: "Shared extraction or summary goals for all requested documents." },
      verbatim_fidelity: { type: "number", minimum: 1, maximum: 100, description: "Shared fidelity target. 100 is closest to source text; 1 is concise summary." }
    }, ["requests"])
  },
  {
    name: "getCaseFileDocumentIndex",
    description: "List case-file document IDs and metadata, optionally filtered by document type.",
    inputSchema: objectSchema({
      scope: { type: "array", items: { type: "string", enum: caseFileScopes }, description: "Optional document type filters." }
    })
  },
  {
    name: "amendCaseFileDocument",
    description: "Amend structured case-file document details, ratings, notes, and relationships.",
    inputSchema: objectSchema({
      update: objectSchema({
        targetCaseFileId: { ...stringOrNumberSchema, description: "Case-file document ID to amend." },
        severityRating: { type: "number" },
        severityReasons: { type: "array", items: { type: "string" } },
        notes: { type: "array", items: { type: "string" } },
        complianceRating: { type: "number" },
        complianceReasons: { type: "array", items: { type: "string" } },
        completionRating: { type: "number", description: "Rates how close to fully complete the call to action is." },
        completionReasons: { type: "array", items: { type: "string" } },
        addRelatedDocuments: arrayOf(objectSchema({
          relatedToDocumentId: { type: "number", description: "Related document ID." },
          relationshipType: { type: "string", description: "How the related document connects to the target document." }
        }, ["relatedToDocumentId", "relationshipType"])),
        associateResponsiveAction: arrayOf(objectSchema({
          relatedCtaDocumentId: { type: "number", description: "Related call-to-action document ID." },
          complianceChapter13: { type: "number" },
          complianceChapter13Reasons: { type: "array", items: { type: "string" } },
          completionPercentage: { type: "number" },
          completionReasons: { type: "array", items: { type: "string" } }
        }, ["relatedCtaDocumentId", "complianceChapter13", "complianceChapter13Reasons", "completionPercentage", "completionReasons"])),
        sentimentRating: { type: "number" },
        sentimentReasons: { type: "array", items: { type: "string" } },
        chapter13Rating: { type: "number" },
        chapter13Reasons: { type: "array", items: { type: "string" } },
        titleIXRating: { type: "number" },
        titleIXReasons: { type: "array", items: { type: "string" } },
        explanation: { type: "string", description: "Reason the amendment is being made." }
      }, ["targetCaseFileId", "explanation"], true)
    }, ["update"])
  },
  {
    name: "sequentialthinking",
    description: "Perform structured sequential thinking for complex case analysis or planning.",
    inputSchema: objectSchema({
      thought: { type: "string", description: "Current thinking step." },
      nextThoughtNeeded: { type: "boolean", description: "Whether another thought is needed." },
      thoughtNumber: { type: "number", minimum: 1, description: "Current thought number." },
      totalThoughts: { type: "number", minimum: 1, description: "Estimated total thoughts." },
      isRevision: { type: "boolean", description: "Whether this revises an earlier thought." },
      revisesThought: { type: "number", description: "Thought number being revised." },
      branchFromThought: { type: "number", description: "Thought number where a branch begins." },
      branchId: { type: "string", description: "Branch identifier." },
      needsMoreThoughts: { type: "boolean", description: "Whether additional thoughts are needed." }
    }, ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"])
  },
  {
    name: "createTodo",
    description: "Create or replace a compliance-oriented todo list.",
    inputSchema: objectSchema({
      listId: { type: "string", description: "Optional stable list ID." },
      title: { type: "string", description: "Todo list title." },
      description: { type: "string", description: "Todo list description." },
      status: { type: "string", enum: ["pending", "active", "complete"], description: "List status." },
      priority: { type: "string", enum: ["high", "medium", "low"], description: "List priority." },
      todos: arrayOf(objectSchema({
        id: { type: "string", description: "Optional stable todo ID." },
        title: { type: "string", description: "Task title." },
        description: { type: "string", description: "Task details." },
        status: { type: "string", enum: ["pending", "active", "complete"] },
        completed: { type: "boolean" },
        priority: { type: "string", enum: ["high", "medium", "low"] }
      }, ["title"]))
    }, ["title"])
  },
  {
    name: "getTodos",
    description: "Read todo lists, optionally filtered by completion state or list ID.",
    inputSchema: objectSchema({
      completed: { type: "boolean", description: "Filter by completion state." },
      listId: { type: "string", description: "Optional list ID." }
    })
  },
  {
    name: "updateTodo",
    description: "Update an existing todo item.",
    inputSchema: objectSchema({
      id: { type: "string", description: "Todo ID." },
      title: { type: "string", description: "New title." },
      description: { type: "string", description: "New description." },
      completed: { type: "boolean", description: "Completion flag." },
      status: { type: "string", enum: ["pending", "active", "complete"] },
      priority: { type: "string", enum: ["high", "medium", "low"] }
    }, ["id"])
  },
  {
    name: "toggleTodo",
    description: "Advance a todo through its completion workflow.",
    inputSchema: objectSchema({ id: { type: "string", description: "Todo ID." } }, ["id"])
  },
  {
    name: "getCaseWorkspace",
    description: "Return a summary of a case workspace.",
    inputSchema: objectSchema({ caseId: { type: "string", description: "Case identifier." } }, ["caseId"])
  },
  {
    name: "readWorkspaceFile",
    description: "Read a case workspace file.",
    inputSchema: objectSchema({
      caseId: { type: "string", description: "Case identifier." },
      file: { type: "string", enum: workspaceFiles, description: "Workspace file to read." }
    }, ["caseId", "file"])
  },
  {
    name: "appendWorkspaceTask",
    description: "Append a task to a case workspace.",
    inputSchema: objectSchema({
      caseId: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      status: { type: "string", enum: taskStatuses },
      priority: { type: "string", enum: taskPriorities },
      owner: { type: "string", enum: taskOwners },
      relatedDocumentIds: { type: "array", items: { type: "string" } },
      relatedQuestionIds: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } }
    }, ["caseId", "title"])
  },
  {
    name: "updateWorkspaceTaskStatus",
    description: "Update the status of a case workspace task.",
    inputSchema: objectSchema({
      caseId: { type: "string" },
      taskId: { type: "string" },
      status: { type: "string", enum: taskStatuses },
      blockedReason: { type: "string" }
    }, ["caseId", "taskId", "status"])
  },
  {
    name: "updateWorkspaceTaskDetails",
    description: "Update editable fields on a case workspace task.",
    inputSchema: objectSchema({
      caseId: { type: "string" },
      taskId: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      priority: { type: "string", enum: taskPriorities },
      owner: { type: "string", enum: taskOwners },
      tags: { type: "array", items: { type: "string" } }
    }, ["caseId", "taskId"])
  },
  {
    name: "upsertWorkspaceDocumentSummary",
    description: "Create or update a document summary in a case workspace.",
    inputSchema: objectSchema({
      caseId: { type: "string" },
      documentId: { type: "string" },
      title: { type: "string" },
      date: { type: "string" },
      summary: { type: "string" },
      relevance: { type: "array", items: { type: "string" } },
      status: { type: "string", enum: ["draft", "reviewed", "needs_refresh"] },
      sourceSummaryId: { type: "string" },
      lastRefreshedAt: { type: "string" }
    }, ["caseId", "documentId", "summary", "status"])
  },
  {
    name: "addOpenQuestion",
    description: "Add an open question to a case workspace.",
    inputSchema: objectSchema({
      caseId: { type: "string" },
      question: { type: "string" },
      type: { type: "string", enum: questionTypes },
      status: { type: "string", enum: questionStatuses },
      relatedDocumentIds: { type: "array", items: { type: "string" } },
      notes: { type: "string" }
    }, ["caseId", "question", "type"])
  },
  {
    name: "updateOpenQuestionStatus",
    description: "Update an open question's status or notes.",
    inputSchema: objectSchema({
      caseId: { type: "string" },
      questionId: { type: "string" },
      status: { type: "string", enum: questionStatuses },
      notes: { type: "string" }
    }, ["caseId", "questionId", "status"])
  },
  {
    name: "appendWorkspaceSessionLog",
    description: "Append a session log entry to a case workspace.",
    inputSchema: objectSchema({
      caseId: { type: "string" },
      actor: { type: "string", enum: ["system", "model", "user"] },
      summary: { type: "string" }
    }, ["caseId", "summary"])
  },
  {
    name: "compactWorkspace",
    description: "Compact workspace metadata and regenerate workspace markdown projections.",
    inputSchema: objectSchema({ caseId: { type: "string" } }, ["caseId"])
  }
];
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

function aliasedRemoteTools(toolNames: Set<string>, aliases: Record<string, string>): ToolDefinition[] {
  const publicNameByUpstreamName = new Map(Object.entries(aliases).map(([publicName, upstreamName]) => [upstreamName, publicName]));
  return exposedRemoteTools
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

const exposedSearchTools = aliasedRemoteTools(searchToolNames, searchRemoteToolAliases);
const exposedTodoTools = aliasedRemoteTools(todoToolNames, todoRemoteToolAliases);
const exposedCaseWorkspaceTools = aliasedRemoteTools(caseWorkspaceToolNames, caseWorkspaceRemoteToolAliases);
const exposedDefaultRemoteTools = exposedRemoteTools.filter(
  (tool) =>
    !caseFileToolNames.has(tool.name) &&
    !searchToolNames.has(tool.name) &&
    !todoToolNames.has(tool.name) &&
    !caseWorkspaceToolNames.has(tool.name)
);

const memoryTools: ToolDefinition[] = [
  {
    name: "list",
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
    name: "insert",
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
    name: "categories",
    description: "Get the available memory categories for the authenticated Compliance Theater app session.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "get",
    description: "Get a memory by its ID.",
    inputSchema: {
      type: "object",
      properties: { memory_id: { type: "string", description: "Memory UUID." } },
      required: ["memory_id"],
      additionalProperties: false
    }
  },
  {
    name: "update",
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
    name: "search",
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
    name: "related",
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

const readCaseFileOutputSchema = objectSchema({
  isError: { type: "boolean", description: "Whether the app route reported an error." },
  value: objectSchema({
    case_file: objectSchema({
      unitId: { type: "number", description: "Case-file document/unit ID." },
      documentType: { type: "string", description: "Case-file document type, such as email, attachment, note, key_point, cta, or cta_response." },
      emailId: { type: ["string", "null"], description: "Source email ID, when available." },
      attachmentId: { type: ["number", "null"], description: "Source attachment ID, when available." },
      documentPropertyId: { type: ["string", "null"], description: "Source document-property ID, when available." },
      content: { type: ["string", "null"], description: "Full-fidelity, unsummarized text content for the requested case file." },
      createdOn: { type: ["string", "null"], description: "Creation timestamp." },
      docRel_sourceDoc: { type: "array", items: { type: "object", additionalProperties: true }, description: "Documents related where this case file is the source." },
      docRel_targetDoc: { type: "array", items: { type: "object", additionalProperties: true }, description: "Documents related where this case file is the target." },
      docProp: { type: ["object", "null"], additionalProperties: true, description: "Primary structured document property metadata, when available." },
      docProps: { type: "array", items: { type: "object", additionalProperties: true }, description: "Additional structured document property records." },
      email: { type: ["object", "null"], additionalProperties: true, description: "Email metadata and linked email details for email case files." },
      emailAttachment: { type: ["object", "null"], additionalProperties: true, description: "Attachment metadata for attachment case files." }
    }, [], true)
  }, ["case_file"])
}, ["isError", "value"]);

const caseFileTools: ToolDefinition[] = [
  {
    name: "get",
    description: "Retrieve case-file documents either directly without preprocessing or through goal-based batch extraction.",
    inputSchema: objectSchema({
      mode: {
        type: "string",
        enum: ["direct", "goals"],
        description: "direct returns full-fidelity unsummarized documents, up to 3 IDs; goals uses the batch preprocessor with optional goals and fidelity."
      },
      caseFileId: { ...stringOrNumberSchema, description: "Single case-file ID. Convenience alias for ids with one item." },
      ids: { type: "array", items: stringOrNumberSchema, description: "Case-file IDs to retrieve. Direct mode allows at most 3 IDs." },
      requests: arrayOf(objectSchema({
        caseFileId: { ...stringOrNumberSchema, description: "Case-file document ID to retrieve." },
        goals: { type: "array", items: { type: "string" }, description: "Document-specific extraction or summary goals." },
        verbatimFidelity: { type: "number", minimum: 1, maximum: 100, description: "Document-specific fidelity override." }
      }, ["caseFileId"])),
      goals: { type: "array", items: { type: "string" }, description: "Shared extraction or summary goals for goals mode." },
      verbatim_fidelity: { type: "number", minimum: 1, maximum: 100, description: "Shared fidelity target for goals mode." }
    }, ["mode"]),
    outputSchema: objectSchema({
      mode: { type: "string", enum: ["direct", "goals"] },
      items: {
        type: "array",
        items: objectSchema({
          caseFileId: stringOrNumberSchema,
          result: readCaseFileOutputSchema
        }, ["caseFileId", "result"])
      },
      result: { description: "Batch/goals mode response from getMultipleCaseFileDocuments." }
    }, ["mode"], true)
  },
  {
    name: "amend",
    description: "Amend structured case-file document details, ratings, notes, and relationships.",
    inputSchema: objectSchema({
      update: objectSchema({
        targetCaseFileId: { ...stringOrNumberSchema, description: "Case-file document ID to amend." },
        severityRating: { type: "number" },
        severityReasons: { type: "array", items: { type: "string" } },
        notes: { type: "array", items: { type: "string" } },
        complianceRating: { type: "number" },
        complianceReasons: { type: "array", items: { type: "string" } },
        completionRating: { type: "number", description: "Rates how close to fully complete the call to action is." },
        completionReasons: { type: "array", items: { type: "string" } },
        addRelatedDocuments: arrayOf(objectSchema({
          relatedToDocumentId: { type: "number", description: "Related document ID." },
          relationshipType: { type: "string", description: "How the related document connects to the target document." }
        }, ["relatedToDocumentId", "relationshipType"])),
        associateResponsiveAction: arrayOf(objectSchema({
          relatedCtaDocumentId: { type: "number", description: "Related call-to-action document ID." },
          complianceChapter13: { type: "number" },
          complianceChapter13Reasons: { type: "array", items: { type: "string" } },
          completionPercentage: { type: "number" },
          completionReasons: { type: "array", items: { type: "string" } }
        }, ["relatedCtaDocumentId", "complianceChapter13", "complianceChapter13Reasons", "completionPercentage", "completionReasons"])),
        sentimentRating: { type: "number" },
        sentimentReasons: { type: "array", items: { type: "string" } },
        chapter13Rating: { type: "number" },
        chapter13Reasons: { type: "array", items: { type: "string" } },
        titleIXRating: { type: "number" },
        titleIXReasons: { type: "array", items: { type: "string" } },
        explanation: { type: "string", description: "Reason the amendment is being made." }
      }, ["targetCaseFileId", "explanation"], true)
    }, ["update"])
  }
];

const coreHelperTools: ToolDefinition[] = [
  {
    name: "read_case_file",
    description: "Retrieve one full-fidelity, unsummarized case file by ID from the Compliance Theater app. Useful for loading one complete case file at a time without MCP summarization or preprocessing.",
    inputSchema: objectSchema({
      caseFileId: {
        ...stringOrNumberSchema,
        description: "Case-file ID to retrieve. May be a numeric document/unit ID or a GUID accepted by the app's document-unit API."
      }
    }, ["caseFileId"]),
    outputSchema: readCaseFileOutputSchema
  }
];
const graphToolInputSchemas: Record<string, AnyRecord> = {
  graph_schema: objectSchema({
    properties: { type: "object" }
  }, ["properties"]),
  graph_read: objectSchema({
    query: { type: "string" },
    params: {
      type: "object",
      description: "Cypher parameters. To materialize a query embedding inline, set a parameter value to { \"$embed\": \"query text\", \"modelSize\": \"small\" }."
    },
    vectorParams: {
      type: "object",
      additionalProperties: {
        anyOf: [
          { type: "string" },
          objectSchema({
            text: { type: "string" },
            query: { type: "string" },
            queryText: { type: "string" },
            query_text: { type: "string" },
            modelSize: { type: "string", enum: ["large", "small"] },
            model_size: { type: "string", enum: ["large", "small"] },
            size: { type: "string", enum: ["large", "small"] }
          }, [], true)
        ]
      },
      description: "Optional map of Cypher parameter names to query text embedding specs. Each value is embedded and passed to Neo4j as that parameter."
    }
  }, ["query"]),
  graph_write: objectSchema({
    query: { type: "string" },
    params: {
      type: "object",
      description: "Cypher parameters. To materialize a query embedding inline, set a parameter value to { \"$embed\": \"query text\", \"modelSize\": \"small\" }."
    },
    vectorParams: {
      type: "object",
      additionalProperties: {
        anyOf: [
          { type: "string" },
          objectSchema({
            text: { type: "string" },
            query: { type: "string" },
            queryText: { type: "string" },
            query_text: { type: "string" },
            modelSize: { type: "string", enum: ["large", "small"] },
            model_size: { type: "string", enum: ["large", "small"] },
            size: { type: "string", enum: ["large", "small"] }
          }, [], true)
        ]
      },
      description: "Optional map of Cypher parameter names to query text embedding specs. Each value is embedded and passed to Neo4j as that parameter."
    }
  }, ["query"])
};

const graphTools: ToolDefinition[] = [
  {
    name: "graph_schema",
    description: "Retrieve Neo4j graph schema information, including node labels, relationship types, and property keys.",
    inputSchema: graphToolInputSchemas.graph_schema
  },
  {
    name: "graph_read",
    description: "Run a read-only Cypher query against the configured Neo4j graph database.",
    inputSchema: graphToolInputSchemas.graph_read
  },
  {
    name: "graph_write",
    description: "Run a write-capable Cypher query against the configured Neo4j graph database.",
    inputSchema: graphToolInputSchemas.graph_write
  }
];

const graphToolAliases: Record<string, string> = {
  graph_schema: "get-schema",
  graph_read: "read-cypher",
  graph_write: "write-cypher"
};

const searchHelperTools: ToolDefinition[] = [
  {
    name: "embed",
    description: "Read or generate chunked vector embeddings for a single case file through the Compliance Theater app document-unit embeddings API.",
    inputSchema: objectSchema({
      caseFileId: {
        ...stringOrNumberSchema,
        description: "Case-file document/unit ID to read or embed."
      },
      modelSize: {
        type: "string",
        enum: ["large", "small"],
        default: "large",
        description: "Embedding model size. Sent as the size query string. Defaults to large for query-vectors."
      },
      action: {
        type: "string",
        enum: ["read", "embed", "embed-if-missing", "query-vectors"],
        description: "read returns existing embedding data or null if missing; embed always recomputes document chunk embeddings; embed-if-missing reads first and computes only when missing; query-vectors encodes provided query text through the app /api/ai/embed route."
      },
      text: {
        type: "string",
        description: "Query text to encode when action is query-vectors."
      },
      index: {
        anyOf: [{ type: "integer", minimum: 0 }, { type: "string" }],
        description: "Optional chunk/vector index for read-only access to a specific embedding chunk."
      }
    }, ["action"]),
    outputSchema: objectSchema({
      action: { type: "string", enum: ["read", "embed", "embed-if-missing", "query-vectors"] },
      caseFileId: { anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
      modelSize: { type: "string", enum: ["large", "small"] },
      index: { anyOf: [{ type: "integer" }, { type: "string" }, { type: "null" }] },
      endpoint: { type: "string", description: "App API path called, without host." },
      generated: { type: "boolean", description: "Whether this call requested vector generation." },
      result: { description: "Embedding API response, or null when read finds no embedding data." }
    }, ["action", "caseFileId", "modelSize", "generated", "result"], true)
  },
  ...graphTools
];
const utilityTools: ToolDefinition[] = [
  {
    name: "call_api",
    description: "Call an authenticated Compliance Theater app API endpoint. Provide a URL relative to the configured app host's /api path, such as document-unit/8 or memory/memories/. The wrapper sends the request with its wrapped app session cookies and returns the response.",
    inputSchema: objectSchema({
      url: {
        type: "string",
        description: "URL relative to the Compliance Theater /api root. Examples: document-unit/8, api/document-unit/8, /api/document-unit/8?include=email."
      },
      method: {
        type: "string",
        default: "GET",
        description: "HTTP method to use. Defaults to GET. Supports GET, POST, PUT, PATCH, DELETE, and other token-style HTTP methods."
      },
      data: {
        description: "Optional JSON request body. Do not pass data with GET or HEAD; include query parameters in the URL instead."
      }
    }, ["url"], true),
    outputSchema: objectSchema({
      ok: { type: "boolean", description: "Whether the HTTP response status is 2xx." },
      status: { type: "integer", description: "HTTP response status." },
      statusText: { type: "string", description: "HTTP response status text." },
      method: { type: "string", description: "HTTP method used." },
      url: { type: "string", description: "Resolved app API URL." },
      body: { description: "Parsed JSON response body when JSON was returned; otherwise null." },
      text: { type: ["string", "null"], description: "Raw text response when the response was not JSON." }
    }, ["ok", "status", "method", "url"], true)
  },
  {
    name: "list",
    description: "List Compliance Theater abilities or resources. Defaults to abilities.",
    inputSchema: objectSchema({
      type: {
        type: "string",
        enum: ["abilities", "resources"],
        default: "abilities",
        description: "Directory type to list."
      }
    })
  },
  {
    name: "auth",
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
const helperTools: ToolDefinition[] = [...coreHelperTools, ...caseFileTools, ...searchHelperTools, ...utilityTools, ...memoryTools];
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
    destructiveHint: name === "graph_write",
    idempotentHint: idempotentHelperNames.has(name),
    openWorldHint: false
  };
}
const exposedHelperTools = withAnnotations(helperTools, annotationsForHelperTool);
const exposedCoreHelperTools = withAnnotations(
  coreHelperTools.filter((tool) => tool.name !== "read_case_file"),
  annotationsForHelperTool
);
const exposedCaseFileTools = withAnnotations(caseFileTools, annotationsForHelperTool);
const exposedSearchHelperTools = withAnnotations(searchHelperTools, annotationsForHelperTool);
const exposedUtilityTools = withAnnotations(utilityTools, annotationsForHelperTool);
const exposedMemoryTools = withAnnotations(memoryTools, annotationsForHelperTool);

async function writeCachedToken(token: Token): Promise<void> {
  if (optional("DISABLE_TOKEN_CACHE") === "1") {
    return;
  }
  await writeCachedTokenFile(cachePath(), token, { logger: log });
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

function textToolResult(text: string): JsonToolResult {
  return { content: [{ type: "text", text }] };
}

function jsonToolResult(value: unknown): JsonToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: { result: value }
  };
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

function exposedHelperToolsForToolset(): ToolDefinition[] {
  const toolset = configuredToolset();
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

function listTools(): ToolDefinition[] {
  const toolset = configuredToolset();
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

function namespaceTools(serverName: ServerName): ToolDefinition[] {
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

function namespaceNamesForToolset(): ServerName[] {
  const toolset = configuredToolset();
  if (toolset === "all") {
    return serverNames;
  }
  return [serverNameForToolset(toolset)];
}

function toOpenAiFunctionTool(tool: ToolDefinition): OpenAiFunctionToolDefinition {
  return {
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema || objectSchema({})
  };
}

function listOpenAiNamespaceTools(): OpenAiNamespaceToolDefinition[] {
  return namespaceNamesForToolset().map((serverName) => ({
    type: "namespace",
    name: serverName,
    description: namespaceDescriptions[serverName],
    tools: namespaceTools(serverName).map(toOpenAiFunctionTool)
  }));
}

function remoteToolIsCallable(name: string | undefined): boolean {
  const toolset = configuredToolset();
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

function upstreamRemoteToolName(name: string | undefined): string | undefined {
  const toolset = configuredToolset();
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

function helperToolIsCallable(name: string | undefined): boolean {
  const localName = unprefixedToolName(name);
  return Boolean(localName && exposedHelperToolsForToolset().some((tool) => tool.name === localName));
}

async function listResources(): Promise<AnyRecord[]> {
  if (configuredToolset() !== "default" && configuredToolset() !== "all") {
    return collectPaginated("resources/list", "resources");
  }
  const localResources = await listLocalFileResources();
  const remoteResources = await collectPaginated("resources/list", "resources").catch((error) => {
    log("remote resources/list failed while listing local file resources", { message: asError(error).message });
    return [];
  });
  return [...localResources, ...remoteResources];
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
    const toolset = configuredToolset();
    const localName = unprefixedToolName(name) || name;
    if (toolset === "memory" && memoryTools.some((tool) => tool.name === localName)) {
      sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await callMemoryTool(localName, args, freshTokenAfterBadRequest)) });
      return;
    }

    if (localName === "read_case_file") {
      sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await readCaseFileTool(args, freshTokenAfterBadRequest)) });
      return;
    }

    if (localName === "get") {
      sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await getCaseFileTool(args, remoteRequest, freshTokenAfterBadRequest)) });
      return;
    }

    if (localName === "amend") {
      sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await amendCaseFileTool(args, remoteRequest)) });
      return;
    }

    if (localName === "embed") {
      sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await manageCaseFileEmbeddingsTool(args, freshTokenAfterBadRequest)) });
      return;
    }

    if (localName in graphToolAliases) {
      const generateQueryVectors = createGenerateQueryVectors(freshTokenAfterBadRequest);
      const graphArgs = localName === "graph_read" || localName === "graph_write"
        ? await materializeGraphVectorParams(args, generateQueryVectors)
        : args;
      sendToClient({ jsonrpc: "2.0", id, result: await callNeo4jGraphTool(localName, graphArgs) });
      return;
    }

    if (localName === "call_api") {
      sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await callApiTool(args, freshTokenAfterBadRequest)) });
      return;
    }

    if (toolset !== "utils" && memoryTools.some((tool) => tool.name === localName)) {
      sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await callMemoryTool(localName, args, freshTokenAfterBadRequest)) });
      return;
    }

    if (localName === "list") {
      const listType = args.type ?? "abilities";
      if (listType === "abilities") {
        const [tools, resources, templates] = await Promise.all([
          Promise.resolve(listTools()),
          listResources().catch(() => []),
          listResourceTemplates().catch(() => [])
        ]);
        sendToClient({ jsonrpc: "2.0", id, result: textToolResult(formatAbilities(tools, resources, templates)) });
      } else if (listType === "resources") {
        const [resources, templates] = await Promise.all([
          listResources().catch(() => []),
          listResourceTemplates().catch(() => [])
        ]);
        sendToClient({ jsonrpc: "2.0", id, result: textToolResult(formatResourceDirectory(resources, templates)) });
      } else {
        sendToClient(errorResponse(id, -32602, "type must be one of: abilities, resources"));
      }
      return;
    }

    if (localName === "auth") {
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
        openaiTools: listOpenAiNamespaceTools()
      }
    });
    return;
  }

  if (message.method === "tools/list_openai" || message.method === "tools/list/openai") {
    sendToClient({ jsonrpc: "2.0", id: message.id, result: { tools: listOpenAiNamespaceTools() } });
    return;
  }

  if (message.method === "resources/list") {
    sendToClient({ jsonrpc: "2.0", id: message.id, result: { resources: await listResources() } });
    return;
  }

  if (message.method === "resources/read" && (configuredToolset() === "default" || configuredToolset() === "all")) {
    const localResource = await readLocalFileResource(String(message.params?.uri || ""));
    if (localResource) {
      sendToClient({ jsonrpc: "2.0", id: message.id, result: localResource });
      return;
    }
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
