#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_readline_1 = require("node:readline");
const runtime_utils_1 = require("./runtime-utils");
function asError(error) {
    return error instanceof Error ? error : new Error(String(error));
}
function httpStatusError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}
function httpStatusFromError(error) {
    const normalized = asError(error);
    if (typeof normalized.status === "number") {
        return normalized.status;
    }
    const match = /\bHTTP\s+(\d{3})\b/i.exec(normalized.message);
    return match ? Number(match[1]) : undefined;
}
function isHttpBadRequest(error) {
    return httpStatusFromError(error) === 400;
}
const PREFIX = "MCP_COMPLIANCE_THEATER_RESOURCE_";
const env = process.env;
let registeredClient;
let logWriteFailed = false;
let remote;
let remoteQueue = Promise.resolve({});
let neo4jRemote;
let neo4jSettingsCache;
let neo4jAutoDiscoveryAttempted = false;
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
function objectSchema(properties, required = [], additionalProperties = false) {
    return { type: "object", properties, required, additionalProperties };
}
function arrayOf(items) {
    return { type: "array", items };
}
const stringOrNumberSchema = {
    anyOf: [{ type: "string" }, { type: "number" }]
};
function displayTitle(name) {
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
function annotationsForRemoteTool(name) {
    const readOnly = readOnlyRemoteToolNames.has(name);
    return {
        title: displayTitle(name),
        readOnlyHint: readOnly,
        destructiveHint: false,
        idempotentHint: idempotentRemoteToolNames.has(name),
        openWorldHint: false
    };
}
function withAnnotations(tools, getAnnotations) {
    return tools.map((tool) => ({
        ...tool,
        annotations: {
            ...getAnnotations(tool.name),
            ...(tool.annotations || {})
        }
    }));
}
const serverNames = [
    "compliance-theater",
    "compliance-theater-memory",
    "compliance-theater-utils",
    "compliance-theater-todo",
    "compliance-theater-case-workspace",
    "compliance-theater-search",
    "compliance-theater-case-files"
];
function serverNameForToolset(toolset) {
    if (toolset === "memory") {
        return "compliance-theater-memory";
    }
    if (toolset === "utils") {
        return "compliance-theater-utils";
    }
    if (toolset === "todo") {
        return "compliance-theater-todo";
    }
    if (toolset === "case-workspace") {
        return "compliance-theater-case-workspace";
    }
    if (toolset === "search") {
        return "compliance-theater-search";
    }
    if (toolset === "case-files") {
        return "compliance-theater-case-files";
    }
    return "compliance-theater";
}
function prefixedToolName(serverName, toolName) {
    return `${serverName}_${toolName}`;
}
function unprefixedToolName(toolName) {
    if (!toolName) {
        return undefined;
    }
    for (const serverName of serverNames) {
        const prefix = `${serverName}_`;
        if (toolName.startsWith(prefix)) {
            return toolName.slice(prefix.length);
        }
    }
    return toolName;
}
function prefixToolDefinitions(tools, serverName) {
    return tools.map((tool) => {
        const name = prefixedToolName(serverName, tool.name);
        return {
            ...tool,
            name,
            description: `${tool.description || "No description"} Exposed as ${name}.`,
            annotations: {
                ...tool.annotations,
                title: displayTitle(name)
            }
        };
    });
}
const staticRemoteTools = [
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
const searchRemoteToolAliases = {
    policy: "searchPolicyStore",
    case_file: "searchCaseFile",
    index: "getCaseFileDocumentIndex"
};
const todoRemoteToolAliases = {
    insert: "createTodo",
    get: "getTodos",
    update: "updateTodo",
    toggle: "toggleTodo"
};
const caseWorkspaceRemoteToolAliases = {
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
function aliasedRemoteTools(toolNames, aliases) {
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
const exposedDefaultRemoteTools = exposedRemoteTools.filter((tool) => !caseFileToolNames.has(tool.name) &&
    !searchToolNames.has(tool.name) &&
    !todoToolNames.has(tool.name) &&
    !caseWorkspaceToolNames.has(tool.name));
const memoryTools = [
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
const caseFileTools = [
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
const coreHelperTools = [
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
const graphToolInputSchemas = {
    graph_schema: objectSchema({
        properties: { type: "object" }
    }, ["properties"]),
    graph_read: objectSchema({
        query: { type: "string" },
        params: { type: "object" }
    }, ["query"]),
    graph_write: objectSchema({
        query: { type: "string" },
        params: { type: "object" }
    }, ["query"])
};
const graphTools = [
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
const graphToolAliases = {
    graph_schema: "get_schema",
    graph_read: "read_cypher",
    graph_write: "write_cypher"
};
const searchHelperTools = [
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
const utilityTools = [
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
const helperTools = [...coreHelperTools, ...caseFileTools, ...searchHelperTools, ...utilityTools, ...memoryTools];
function annotationsForHelperTool(name) {
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
const exposedCoreHelperTools = withAnnotations(coreHelperTools.filter((tool) => tool.name !== "read_case_file"), annotationsForHelperTool);
const exposedCaseFileTools = withAnnotations(caseFileTools, annotationsForHelperTool);
const exposedSearchHelperTools = withAnnotations(searchHelperTools, annotationsForHelperTool);
const exposedUtilityTools = withAnnotations(utilityTools, annotationsForHelperTool);
const exposedMemoryTools = withAnnotations(memoryTools, annotationsForHelperTool);
const defaultEnvValues = {
    SERVER_URL: "https://full-ui.compliance-theater.obapps.net/api/ai/tools/sse",
    AUTH_ISSUER: "https://login.obapps.net/realms/compliance-theater",
    CLIENT_ID: "codex",
    OAUTH_SCOPE: "openid",
};
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
    const resolved = resolveValue(env[key(name)]);
    const value = !resolved || resolved.startsWith("[TODO:")
        ? defaultEnvValues[name]
        : resolved;
    if (!value || value.startsWith("[TODO:")) {
        return undefined;
    }
    return value;
}
function configuredToolset() {
    const value = optional("TOOLSET")?.trim().toLowerCase();
    if (value === "all" ||
        value === "default" ||
        value === "memory" ||
        value === "utils" ||
        value === "todo" ||
        value === "case-workspace" ||
        value === "search" ||
        value === "case-files") {
        return value;
    }
    return "all";
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
        (0, node_path_1.join)((0, node_os_1.homedir)(), ".codex", "compliance-theater", "compliance-theater-wrapper.log");
}
function redact(value) {
    if (Array.isArray(value)) {
        return value.map(redact);
    }
    if (!value || typeof value !== "object") {
        return value;
    }
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [
        name,
        /token|secret|password|authorization|credential/i.test(name) ? "[redacted]" : redact(item)
    ]));
}
function log(message, details) {
    console.error(`[compliance-theater] ${message}`);
    const payload = {
        timestamp: new Date().toISOString(),
        pid: process.pid,
        message,
        ...(details ? { details: redact(details) } : {})
    };
    const path = logFilePath();
    try {
        (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(path), { recursive: true });
        (0, node_fs_1.appendFileSync)(path, `${JSON.stringify(payload)}\n`, "utf8");
    }
    catch (error) {
        if (!logWriteFailed) {
            logWriteFailed = true;
            console.error(`[compliance-theater] could not write log file ${path}: ${asError(error).message}`);
        }
    }
}
function cachePath() {
    return optional("TOKEN_CACHE_PATH") ||
        (0, node_path_1.join)((0, node_os_1.homedir)(), ".codex", "compliance-theater", "compliance-theater-token-cache.json");
}
function legacyDeviceLoginPath() {
    return (0, node_path_1.join)((0, node_os_1.homedir)(), ".codex", "compliance-theater", "compliance-theater-device-login.json");
}
function neo4jCredentialCachePath() {
    return (0, node_path_1.join)((0, node_path_1.dirname)(cachePath()), "compliance-theater-neo4j-credentials.json");
}
function credentialCachePaths() {
    const paths = [
        { path: cachePath(), label: "cached OAuth token, refresh token, and wrapped Auth.js session cookie" },
        { path: legacyDeviceLoginPath(), label: "legacy device-login state" },
        { path: neo4jCredentialCachePath(), label: "cached Neo4j graph credentials" }
    ];
    const seen = new Set();
    return paths.filter(({ path }) => {
        if (seen.has(path)) {
            return false;
        }
        seen.add(path);
        return true;
    });
}
function tokenSkewMs() {
    return (0, runtime_utils_1.parseNumber)(optional("TOKEN_EXPIRY_SKEW_SECONDS"), 60, 0) * 1000;
}
function httpTimeoutMs() {
    return (0, runtime_utils_1.parseNumber)(optional("HTTP_TIMEOUT_MS"), 360000, 1000);
}
function httpRetryCount() {
    return (0, runtime_utils_1.parseNumber)(optional("HTTP_RETRY_COUNT"), 2, 0);
}
function httpRetryBaseMs() {
    return (0, runtime_utils_1.parseNumber)(optional("HTTP_RETRY_BASE_MS"), 500, 0);
}
function proxyRequestTimeoutMs() {
    return (0, runtime_utils_1.parseNumber)(optional("PROXY_REQUEST_TIMEOUT_MS"), 360000, 1000);
}
async function readCachedToken() {
    const cached = await (0, runtime_utils_1.readCachedTokenFile)(cachePath(), {
        skewMs: tokenSkewMs(),
        logger: log
    });
    return cached?.access_token ? cached : undefined;
}
async function writeCachedToken(token) {
    if (optional("DISABLE_TOKEN_CACHE") === "1") {
        return;
    }
    await (0, runtime_utils_1.writeCachedTokenFile)(cachePath(), token, { logger: log });
}
function normalizeIssuer(value) {
    return value.replace(/\/+$/, "");
}
function metadataCandidates() {
    const explicit = optional("AUTH_METADATA_URL");
    if (explicit) {
        (0, runtime_utils_1.warnIfInsecureUrl)(explicit, log, "OAuth metadata URL");
        return [explicit];
    }
    const issuer = normalizeIssuer(required("AUTH_ISSUER"));
    (0, runtime_utils_1.warnIfInsecureUrl)(issuer, log, "OAuth issuer");
    const url = new URL(issuer);
    const issuerPath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    return [
        `${url.origin}/.well-known/oauth-authorization-server${issuerPath}`,
        `${issuer}/.well-known/oauth-authorization-server`
    ];
}
async function fetchJsonResponse(url, options = {}) {
    const startedAt = Date.now();
    const response = await (0, runtime_utils_1.fetchWithPolicy)(url, {
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
    }
    catch {
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
        throw httpStatusError(String(body.error || body.error_description || `HTTP ${response.status}`), response.status);
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
        }
        catch (error) {
            errors.push(`${url}: ${asError(error).message}`);
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
    const username = required("USERNAME");
    const password = required("PASSWORD");
    const body = new URLSearchParams({ grant_type: "password", username, password });
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
        await (0, runtime_utils_1.sleep)(intervalMs);
        try {
            return await tokenRequest(metadata, new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                device_code: device.device_code,
                client_id: oauthClient.client_id
            }));
        }
        catch (error) {
            const message = asError(error).message.toLowerCase();
            if (message.includes("slow_down")) {
                intervalMs += 5000;
                log(`slowing device authorization polling to ${intervalMs}ms`);
            }
            else if (!message.includes("authorization_pending")) {
                throw error;
            }
        }
    }
    throw new Error("Timed out waiting for device authorization");
}
async function acquireToken(options = {}) {
    const existing = optional("ACCESS_TOKEN");
    if (existing) {
        log("using preconfigured access token");
        return { access_token: existing };
    }
    if (!options.ignoreCache) {
        const cached = await readCachedToken();
        if (cached) {
            return cached;
        }
    }
    else {
        log("ignoring cached token for fresh authentication");
    }
    const metadata = await discoverMetadata();
    const token = (await refreshToken(metadata)) ||
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
async function freshTokenAfterBadRequest(reason) {
    remote = undefined;
    log("HTTP 400 received from protected upstream; clearing cached auth and retrying once", { reason });
    try {
        await clearCachedToken();
    }
    catch (error) {
        log("could not clear cached token before retrying auth", { message: asError(error).message });
    }
    return acquireToken({ ignoreCache: true });
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
    try {
        return await establishRemoteConnection(token);
    }
    catch (error) {
        if (!isHttpBadRequest(error)) {
            throw error;
        }
        const freshToken = await freshTokenAfterBadRequest("remote MCP connection returned HTTP 400");
        return establishRemoteConnection(freshToken);
    }
}
async function optionalAppSessionForMcpTransport(token) {
    let appSession;
    let sessionCookie;
    try {
        appSession = await acquireAppSession(token);
        sessionCookie = (0, runtime_utils_1.appSessionCookieHeader)(appSession);
    }
    catch (error) {
        if (isHttpBadRequest(error)) {
            throw error;
        }
        log(`wrapped app session unavailable for MCP transport; falling back to source bearer: ${asError(error).message}`);
    }
    return { appSession, sessionCookie };
}
async function establishRemoteConnection(token) {
    const { appSession, sessionCookie } = await optionalAppSessionForMcpTransport(token);
    const sseUrl = required("SERVER_URL");
    (0, runtime_utils_1.warnIfInsecureUrl)(sseUrl, log, "Target server URL");
    log("connecting remote MCP SSE", { sseUrl });
    const connection = await (0, runtime_utils_1.connectSse)({
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
        nextId: (0, node_crypto_1.randomInt)(100_000, 999_999)
    });
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
    const response = await (0, runtime_utils_1.fetchWithPolicy)(connection.endpoint, {
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
    remoteQueue = remoteQueue.catch(() => ({})).then(async () => {
        const connection = remote || await connectRemote();
        try {
            return await rawRemoteRequest(connection, method, params);
        }
        catch (error) {
            if (!isHttpBadRequest(error)) {
                throw error;
            }
            const freshToken = await freshTokenAfterBadRequest(`remote MCP request ${method} returned HTTP 400`);
            const retryConnection = await establishRemoteConnection(freshToken);
            return rawRemoteRequest(retryConnection, method, params);
        }
    });
    return remoteQueue;
}
async function rawRemoteRequest(connection, method, params = {}) {
    const id = connection.nextId++;
    log("remote request started", { id, method, paramKeys: Object.keys(params || {}) });
    await (0, runtime_utils_1.rpc)(connection.endpoint, connection.accessToken, id, method, params, {
        timeoutMs: httpTimeoutMs(),
        retries: httpRetryCount(),
        retryBaseMs: httpRetryBaseMs(),
        logger: log,
        sessionCookie: connection.sessionCookie
    });
    const result = await (0, runtime_utils_1.readRpcResult)(connection.reader, id, proxyRequestTimeoutMs());
    log("remote request completed", {
        id,
        method,
        resultKeys: result && typeof result === "object" ? Object.keys(result) : []
    });
    return result || {};
}
function neo4jSetting(name) {
    const value = env[`MCP_COMPLIANCE_THEATER_NEO4J_${name}`];
    if (!value || value.startsWith("[TODO:")) {
        return undefined;
    }
    return value;
}
function neo4jAutoDiscoveryEnabled() {
    const value = env.MCP_COMPLIANCE_THEATER_NEO4J_AUTO_DISCOVERY;
    if (value === undefined || value === "" || value.startsWith("[TODO:")) {
        return true;
    }
    return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}
function completeNeo4jSettings(values) {
    if (values.URI && values.USERNAME && values.PASSWORD && values.DATABASE) {
        return values;
    }
    return undefined;
}
function configuredNeo4jSettings() {
    return {
        URI: neo4jSetting("URI"),
        USERNAME: neo4jSetting("USERNAME"),
        PASSWORD: neo4jSetting("PASSWORD"),
        DATABASE: neo4jSetting("DATABASE")
    };
}
function discoveredNeo4jSettings(config) {
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
    return values;
}
async function readCachedNeo4jSettings() {
    try {
        const cached = JSON.parse(await (0, promises_1.readFile)(neo4jCredentialCachePath(), "utf8"));
        if (cached.expires_at && cached.expires_at > Date.now() + tokenSkewMs()) {
            const settings = completeNeo4jSettings(cached);
            if (settings) {
                log("using cached Neo4j graph credentials", { expiresAt: new Date(cached.expires_at).toISOString() });
                return settings;
            }
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
async function writeCachedNeo4jSettings(settings, expiresAt) {
    const path = neo4jCredentialCachePath();
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(path), { recursive: true });
    await (0, promises_1.writeFile)(path, `${JSON.stringify({
        ...settings,
        expires_at: expiresAt,
        expires_at_iso: new Date(expiresAt).toISOString()
    }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    log("cached discovered Neo4j graph credentials", { expiresAt: new Date(expiresAt).toISOString() });
}
async function discoverNeo4jSettings() {
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
        await writeCachedNeo4jSettings(settings, (0, runtime_utils_1.tokenExpiresAt)(token, 0));
        return settings;
    }
    catch (error) {
        log("Neo4j graph credential discovery failed; falling back to plugin settings", { message: asError(error).message });
        return undefined;
    }
}
async function resolvedNeo4jSettings() {
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
    const pluginSettingNames = {
        URI: "neo4jUri",
        USERNAME: "neo4jUsername",
        PASSWORD: "neo4jPassword",
        DATABASE: "neo4jDatabase"
    };
    const missing = requiredSettings.filter((name) => {
        const value = configuredNeo4jSettings()[name];
        return !value;
    });
    throw new Error(`Neo4j graph tools are not configured. Missing plugin settings: ${missing.map((name) => pluginSettingNames[name]).join(", ")}.`);
}
async function neo4jChildEnv() {
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
function writeStdioMcpMessage(connection, message) {
    const body = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n`;
    connection.child.stdin.write(header + body);
}
function rejectPendingStdioRequests(connection, error) {
    for (const pending of connection.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(error);
    }
    connection.pending.clear();
}
function handleStdioMcpMessage(connection, message) {
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
function parseStdioMcpBuffer(connection) {
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
function rawStdioMcpRequest(connection, method, params = {}, timeoutMs = proxyRequestTimeoutMs()) {
    const id = connection.nextId++;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            connection.pending.delete(id);
            reject(new Error(`Neo4j MCP backend timed out while handling ${method}.`));
        }, timeoutMs);
        connection.pending.set(id, { resolve, reject, timer });
        try {
            writeStdioMcpMessage(connection, { jsonrpc: "2.0", id, method, params });
        }
        catch (error) {
            clearTimeout(timer);
            connection.pending.delete(id);
            reject(asError(error));
        }
    });
}
async function stdioMcpRequest(connection, method, params = {}) {
    connection.queue = connection.queue.catch(() => ({})).then(() => rawStdioMcpRequest(connection, method, params));
    return connection.queue;
}
async function startNeo4jMcpCandidate(command, args, commandLabel) {
    const child = (0, node_child_process_1.spawn)(command, args, {
        cwd: process.cwd(),
        env: await neo4jChildEnv(),
        stdio: "pipe",
        windowsHide: true
    });
    const connection = {
        child,
        commandLabel,
        nextId: (0, node_crypto_1.randomInt)(100_000, 999_999),
        buffer: Buffer.alloc(0),
        pending: new Map(),
        queue: Promise.resolve({})
    };
    child.stdout.on("data", (chunk) => {
        try {
            connection.buffer = Buffer.concat([connection.buffer, chunk]);
            parseStdioMcpBuffer(connection);
        }
        catch (error) {
            rejectPendingStdioRequests(connection, asError(error));
        }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
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
    log("starting Neo4j MCP backend", { commandLabel });
    try {
        await rawStdioMcpRequest(connection, "initialize", {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "compliance-theater-neo4j-bridge", version: "0.1.0" }
        }, 15_000);
        writeStdioMcpMessage(connection, { jsonrpc: "2.0", method: "notifications/initialized", params: {} });
        log("Neo4j MCP backend initialized", { commandLabel });
        return connection;
    }
    catch (error) {
        connection.child.kill();
        throw error;
    }
}
async function connectNeo4jMcp() {
    if (neo4jRemote) {
        return neo4jRemote;
    }
    await resolvedNeo4jSettings();
    const attempts = [
        { command: "python", args: ["-m", "neo4j_mcp_server"], label: "python -m neo4j_mcp_server" },
        { command: "uvx", args: ["neo4j-mcp-server"], label: "uvx neo4j-mcp-server" }
    ];
    const failures = [];
    for (const attempt of attempts) {
        try {
            neo4jRemote = await startNeo4jMcpCandidate(attempt.command, attempt.args, attempt.label);
            return neo4jRemote;
        }
        catch (error) {
            failures.push(`${attempt.label}: ${asError(error).message}`);
            if (neo4jRemote) {
                neo4jRemote.child.kill();
                neo4jRemote = undefined;
            }
        }
    }
    throw new Error(`Neo4j MCP backend could not be started. Tried python -m neo4j_mcp_server and uvx neo4j-mcp-server. Details: ${failures.join(" | ")}`);
}
async function callNeo4jGraphTool(name, args = {}, retried = false) {
    const upstreamName = graphToolAliases[name];
    if (!upstreamName) {
        throw new Error(`Unknown Neo4j graph tool ${name}.`);
    }
    const connection = await connectNeo4jMcp();
    try {
        return await stdioMcpRequest(connection, "tools/call", {
            name: upstreamName,
            arguments: args
        });
    }
    catch (error) {
        const message = asError(error).message;
        if (!retried && /backend exited|failed to start|EPIPE|closed/i.test(message)) {
            neo4jRemote = undefined;
            return callNeo4jGraphTool(name, args, true);
        }
        throw error;
    }
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
        }
        catch (error) {
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
function exposedHelperToolsForToolset() {
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
function listTools() {
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
        ...prefixToolDefinitions(exposedDefaultRemoteTools, "compliance-theater"),
        ...prefixToolDefinitions(exposedCoreHelperTools, "compliance-theater"),
        ...prefixToolDefinitions(exposedMemoryTools, "compliance-theater-memory"),
        ...prefixToolDefinitions(exposedUtilityTools, "compliance-theater-utils"),
        ...prefixToolDefinitions(exposedTodoTools, "compliance-theater-todo"),
        ...prefixToolDefinitions(exposedCaseWorkspaceTools, "compliance-theater-case-workspace"),
        ...prefixToolDefinitions([...exposedSearchTools, ...exposedSearchHelperTools], "compliance-theater-search"),
        ...prefixToolDefinitions(exposedCaseFileTools, "compliance-theater-case-files")
    ];
}
function remoteToolIsCallable(name) {
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
function upstreamRemoteToolName(name) {
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
function helperToolIsCallable(name) {
    const localName = unprefixedToolName(name);
    return Boolean(localName && exposedHelperToolsForToolset().some((tool) => tool.name === localName));
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
function resourcePath(resource) {
    try {
        const parsed = new URL(resource.uri);
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    }
    catch {
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
        (0, runtime_utils_1.warnIfInsecureUrl)(explicit, log, "Session status URL");
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
        (0, runtime_utils_1.warnIfInsecureUrl)(explicit, log, "Session wrap URL");
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
function documentUnitEndpointUrl(caseFileId) {
    return appEndpointUrl(`/api/document-unit/${encodeURIComponent(String(caseFileId))}`);
}
function documentUnitEmbeddingsEndpointUrl(caseFileId, modelSize, index) {
    const encodedId = encodeURIComponent(String(caseFileId));
    const encodedIndex = index === undefined || index === null || index === ""
        ? undefined
        : encodeURIComponent(String(index));
    return appEndpointUrl(`/api/document-unit/${encodedId}/embeddings${encodedIndex === undefined ? "" : `/${encodedIndex}`}`, { size: modelSize });
}
function documentUnitEmbeddingsEndpointPath(caseFileId, index) {
    const encodedId = encodeURIComponent(String(caseFileId));
    const encodedIndex = index === undefined || index === null || index === ""
        ? undefined
        : encodeURIComponent(String(index));
    return `/api/document-unit/${encodedId}/embeddings${encodedIndex === undefined ? "" : `/${encodedIndex}`}`;
}
function aiEmbedEndpointUrl() {
    return appEndpointUrl("/api/ai/embed");
}
function aiEmbedEndpointPath() {
    return "/api/ai/embed";
}
async function clearCachedToken() {
    const messages = [];
    const activeRemote = remote;
    const activeNeo4jRemote = neo4jRemote;
    remote = undefined;
    neo4jRemote = undefined;
    neo4jSettingsCache = undefined;
    neo4jAutoDiscoveryAttempted = false;
    registeredClient = undefined;
    if (activeRemote) {
        try {
            await activeRemote.reader.cancel();
            messages.push("Closed in-memory MCP connection and cleared its wrapped session cookie.");
        }
        catch (error) {
            messages.push(`Cleared in-memory MCP connection state; reader close reported: ${asError(error).message}`);
        }
    }
    else {
        messages.push("Cleared in-memory auth/session state.");
    }
    if (activeNeo4jRemote) {
        activeNeo4jRemote.child.kill();
        messages.push("Closed in-memory Neo4j MCP backend connection.");
    }
    if (optional("DISABLE_TOKEN_CACHE") === "1") {
        messages.push("Token cache is disabled by MCP_COMPLIANCE_THEATER_RESOURCE_DISABLE_TOKEN_CACHE=1.");
        return messages.join("\n");
    }
    for (const { path, label } of credentialCachePaths()) {
        try {
            await (0, promises_1.rm)(path);
            messages.push(`Removed ${label}: ${path}`);
        }
        catch (error) {
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
    const sessionCookie = (0, runtime_utils_1.appSessionCookieHeader)(appSession);
    if (!sessionCookie) {
        throw new Error("Wrapped app session did not include a cookie header.");
    }
    const response = await (0, runtime_utils_1.fetchWithPolicy)(url, {
        headers: {
            Accept: "application/json",
            Cookie: sessionCookie
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
    }
    catch {
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
    const expiresAt = (0, runtime_utils_1.tokenExpiresAt)(cached, 0);
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
        try {
            await writeCachedToken(tokenWithAppSession);
        }
        catch (error) {
            log("could not persist wrapped app session; continuing with in-memory session", {
                message: asError(error).message
            });
        }
    }
    log("wrapped app session acquired", {
        url,
        cookieName: appSession.cookie_name,
        expiresAt: appSession.expires_at_iso
    });
    return appSession;
}
async function acquireAppSession(token) {
    if ((0, runtime_utils_1.isUsableCachedAppSession)(token, tokenSkewMs())) {
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
    try {
        return await memoryApiRequestWithToken(token, method, url, body);
    }
    catch (error) {
        if (!isHttpBadRequest(error)) {
            throw error;
        }
        const freshToken = await freshTokenAfterBadRequest(`Memory API ${method} ${url} returned HTTP 400`);
        return memoryApiRequestWithToken(freshToken, method, url, body);
    }
}
async function memoryApiRequestWithToken(token, method, url, body) {
    const appSession = await acquireAppSession(token);
    const sessionCookie = (0, runtime_utils_1.appSessionCookieHeader)(appSession);
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
        throw httpStatusError(`Memory API ${method} ${url} failed: ${detail}`, responseResult.response.status);
    }
    return responseResult.body;
}
async function appSessionJsonRequest(method, url, body) {
    const token = await acquireToken();
    try {
        return await appSessionJsonRequestWithToken(token, method, url, body);
    }
    catch (error) {
        if (!isHttpBadRequest(error)) {
            throw error;
        }
        const freshToken = await freshTokenAfterBadRequest(`App API ${method} ${url} returned HTTP 400`);
        return appSessionJsonRequestWithToken(freshToken, method, url, body);
    }
}
async function appSessionJsonRequestWithToken(token, method, url, body) {
    const appSession = await acquireAppSession(token);
    const sessionCookie = (0, runtime_utils_1.appSessionCookieHeader)(appSession);
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
        throw httpStatusError(`App API ${method} ${url} failed: ${detail}`, responseResult.response.status);
    }
    return responseResult.body;
}
function appApiEndpointUrl(relativeUrl) {
    const trimmed = relativeUrl.trim();
    if (!trimmed) {
        throw new Error("url is required.");
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
        throw new Error("url must be relative to the Compliance Theater /api root.");
    }
    const withoutLeadingSlash = trimmed.replace(/^\/+/, "");
    const apiRelative = withoutLeadingSlash.replace(/^api(?:\/|$)/i, "");
    const server = new URL(required("SERVER_URL"));
    const apiRoot = new URL("/api/", server.origin);
    const target = new URL(apiRelative, apiRoot);
    if (target.origin !== apiRoot.origin || !target.pathname.startsWith("/api/")) {
        throw new Error("url must resolve inside the Compliance Theater /api root.");
    }
    return target.toString();
}
function normalizeHttpMethod(value) {
    const method = String(value || "GET").trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_-]*$/.test(method)) {
        throw new Error("method must be a valid HTTP method token.");
    }
    return method;
}
function hasToolData(args) {
    return Object.prototype.hasOwnProperty.call(args, "data") && args.data !== undefined;
}
async function appSessionApiResponse(method, url, body) {
    const token = await acquireToken();
    const first = await appSessionApiResponseWithToken(token, method, url, body);
    if (first.status !== 400) {
        return first;
    }
    const freshToken = await freshTokenAfterBadRequest(`App API ${method} ${url} returned HTTP 400`);
    return appSessionApiResponseWithToken(freshToken, method, url, body);
}
async function appSessionApiResponseWithToken(token, method, url, body) {
    const appSession = await acquireAppSession(token);
    const sessionCookie = (0, runtime_utils_1.appSessionCookieHeader)(appSession);
    if (!sessionCookie) {
        throw new Error("Wrapped app session did not include a cookie header.");
    }
    const startedAt = Date.now();
    const response = await (0, runtime_utils_1.fetchWithPolicy)(url, {
        method,
        headers: {
            Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
            Cookie: sessionCookie,
            ...(body === undefined ? {} : { "Content-Type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        timeoutMs: httpTimeoutMs(),
        retries: httpRetryCount(),
        retryBaseMs: httpRetryBaseMs(),
        logger: log
    });
    const text = await response.text();
    let parsedBody = null;
    let parsedJson = false;
    try {
        parsedBody = text ? JSON.parse(text) : null;
        parsedJson = text.trim().length > 0;
    }
    catch {
        parsedBody = null;
    }
    log("App API call completed", {
        url,
        method,
        status: response.status,
        durationMs: Date.now() - startedAt
    });
    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        method,
        url,
        body: parsedBody,
        text: parsedJson ? null : text
    };
}
async function callApiTool(args = {}) {
    const url = appApiEndpointUrl(String(requiredToolArgument(args, "url")));
    const method = normalizeHttpMethod(args.method);
    const includesBody = hasToolData(args);
    if (includesBody && (method === "GET" || method === "HEAD")) {
        throw new Error("data cannot be sent with GET or HEAD. Put query parameters in the url, or use POST/PUT/PATCH.");
    }
    return appSessionApiResponse(method, url, includesBody ? args.data : undefined);
}
async function readCaseFileTool(args = {}) {
    const caseFileId = args.caseFileId ?? args.case_file_id ?? args.id;
    if (caseFileId === undefined || caseFileId === null || caseFileId === "") {
        throw new Error("caseFileId is required.");
    }
    return appSessionJsonRequest("GET", documentUnitEndpointUrl(caseFileId));
}
function caseFileIdsFromArgs(args) {
    const ids = [];
    if (args.caseFileId !== undefined && args.caseFileId !== null && args.caseFileId !== "") {
        ids.push(args.caseFileId);
    }
    if (args.id !== undefined && args.id !== null && args.id !== "") {
        ids.push(args.id);
    }
    if (Array.isArray(args.ids)) {
        ids.push(...args.ids.filter((id) => id !== undefined && id !== null && id !== ""));
    }
    if (Array.isArray(args.requests)) {
        ids.push(...args.requests
            .map((request) => request?.caseFileId)
            .filter((id) => id !== undefined && id !== null && id !== ""));
    }
    return ids;
}
function goalsRequestsFromArgs(args) {
    if (Array.isArray(args.requests) && args.requests.length > 0) {
        return args.requests;
    }
    const ids = caseFileIdsFromArgs(args);
    return ids.map((caseFileId) => ({ caseFileId }));
}
async function getCaseFileTool(args = {}) {
    const mode = args.mode;
    if (mode !== "direct" && mode !== "goals") {
        throw new Error("mode is required and must be one of: direct, goals.");
    }
    if (mode === "direct") {
        if (args.goals !== undefined || args.verbatim_fidelity !== undefined) {
            throw new Error("direct mode does not accept goals or verbatim_fidelity. Use goals mode for preprocessing.");
        }
        const ids = caseFileIdsFromArgs(args);
        if (ids.length === 0) {
            throw new Error("direct mode requires caseFileId, id, ids, or requests.");
        }
        if (ids.length > 3) {
            throw new Error("direct mode supports at most 3 case-file IDs. Use goals mode for larger batches.");
        }
        return {
            mode,
            items: await Promise.all(ids.map(async (caseFileId) => ({
                caseFileId,
                result: await readCaseFileTool({ caseFileId })
            })))
        };
    }
    const requests = goalsRequestsFromArgs(args);
    if (requests.length === 0) {
        throw new Error("goals mode requires requests, ids, caseFileId, or id.");
    }
    return {
        mode,
        result: await remoteRequest("tools/call", {
            name: "getMultipleCaseFileDocuments",
            arguments: {
                requests,
                ...(args.goals === undefined ? {} : { goals: args.goals }),
                ...(args.verbatim_fidelity === undefined ? {} : { verbatim_fidelity: args.verbatim_fidelity })
            }
        })
    };
}
async function amendCaseFileTool(args = {}) {
    return remoteRequest("tools/call", {
        name: "amendCaseFileDocument",
        arguments: args
    });
}
function requiredModelSize(args) {
    const modelSize = args.modelSize ?? args.model_size ?? args.size;
    if (modelSize !== "large" && modelSize !== "small") {
        throw new Error("modelSize is required and must be one of: large, small.");
    }
    return modelSize;
}
function optionalModelSize(args) {
    const modelSize = args.modelSize ?? args.model_size ?? args.size ?? "large";
    if (modelSize !== "large" && modelSize !== "small") {
        throw new Error("modelSize must be one of: large, small.");
    }
    return modelSize;
}
function isMissingEmbeddingResult(value) {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === "string") {
        return value.trim().length === 0;
    }
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    if (typeof value === "object") {
        const record = value;
        if (record.isError === true && !record.value && !record.items && !record.result) {
            return true;
        }
        if ("value" in record) {
            return isMissingEmbeddingResult(record.value);
        }
        if ("result" in record) {
            return isMissingEmbeddingResult(record.result);
        }
        if ("items" in record) {
            return isMissingEmbeddingResult(record.items);
        }
        if ("embeddings" in record && isMissingEmbeddingResult(record.embeddings)) {
            return true;
        }
        const meaningfulKeys = Object.keys(record).filter((key) => record[key] !== undefined && record[key] !== null);
        if (meaningfulKeys.length === 0) {
            return true;
        }
        if (meaningfulKeys.length === 1 && meaningfulKeys[0] === "isError" && record.isError === false) {
            return true;
        }
    }
    return false;
}
async function readEmbeddingsOrNull(caseFileId, modelSize, index) {
    try {
        const result = await appSessionJsonRequest("GET", documentUnitEmbeddingsEndpointUrl(caseFileId, modelSize, index));
        return isMissingEmbeddingResult(result) ? null : result;
    }
    catch (error) {
        const status = httpStatusFromError(error);
        if (status === 404 || status === 204) {
            return null;
        }
        throw error;
    }
}
async function generateEmbeddings(caseFileId, modelSize) {
    return appSessionJsonRequest("PUT", documentUnitEmbeddingsEndpointUrl(caseFileId, modelSize));
}
async function generateQueryVectors(text, modelSize) {
    return appSessionJsonRequest("POST", aiEmbedEndpointUrl(), {
        text,
        size: modelSize
    });
}
function embeddingAction(args) {
    const rawAction = args.action;
    const normalized = typeof rawAction === "string" ? rawAction.replace(/_/g, "-") : "";
    if (normalized === "read" ||
        normalized === "embed" ||
        normalized === "embed-if-missing" ||
        normalized === "query-vectors") {
        return normalized;
    }
    throw new Error("action is required and must be one of: read, embed, embed-if-missing, query-vectors.");
}
async function manageCaseFileEmbeddingsTool(args = {}) {
    const action = embeddingAction(args);
    if (action === "query-vectors") {
        const text = args.text ?? args.query ?? args.queryText ?? args.query_text;
        if (typeof text !== "string" || text.trim() === "") {
            throw new Error("text is required for query-vectors.");
        }
        const modelSize = optionalModelSize(args);
        return {
            action,
            caseFileId: null,
            modelSize,
            index: null,
            endpoint: aiEmbedEndpointPath(),
            generated: true,
            result: await generateQueryVectors(text, modelSize)
        };
    }
    const caseFileId = args.caseFileId ?? args.case_file_id ?? args.documentId ?? args.docId ?? args.id;
    if (caseFileId === undefined || caseFileId === null || caseFileId === "") {
        throw new Error("caseFileId is required.");
    }
    const modelSize = requiredModelSize(args);
    const index = args.index;
    if (index !== undefined && index !== null && index !== "" && action !== "read" && action !== "embed-if-missing") {
        throw new Error("index can only be used with action read or embed-if-missing.");
    }
    if (action === "read") {
        return {
            action,
            caseFileId,
            modelSize,
            index: index ?? null,
            endpoint: documentUnitEmbeddingsEndpointPath(caseFileId, index),
            generated: false,
            result: await readEmbeddingsOrNull(caseFileId, modelSize, index)
        };
    }
    if (action === "embed") {
        return {
            action,
            caseFileId,
            modelSize,
            index: null,
            endpoint: documentUnitEmbeddingsEndpointPath(caseFileId),
            generated: true,
            result: await generateEmbeddings(caseFileId, modelSize)
        };
    }
    const existing = await readEmbeddingsOrNull(caseFileId, modelSize, index);
    if (existing !== null) {
        return {
            action,
            caseFileId,
            modelSize,
            index: index ?? null,
            endpoint: documentUnitEmbeddingsEndpointPath(caseFileId, index),
            generated: false,
            result: existing
        };
    }
    return {
        action,
        caseFileId,
        modelSize,
        index: null,
        endpoint: documentUnitEmbeddingsEndpointPath(caseFileId),
        generated: true,
        result: await generateEmbeddings(caseFileId, modelSize)
    };
}
async function callMemoryTool(name, args = {}) {
    switch (name) {
        case "list":
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
        case "insert":
            return memoryApiRequest("POST", memoryEndpointUrl("memories/"), {
                text: requiredToolArgument(args, "text"),
                ...(args.metadata === undefined ? {} : { metadata: args.metadata }),
                ...(args.infer === undefined ? {} : { infer: args.infer }),
                ...(args.app === undefined ? {} : { app: args.app })
            });
        case "categories":
            return memoryApiRequest("GET", memoryEndpointUrl("memories/categories"));
        case "get":
            return memoryApiRequest("GET", memoryEndpointUrl(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}`));
        case "update":
            return memoryApiRequest("PUT", memoryEndpointUrl(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}`), { memory_content: requiredToolArgument(args, "memory_content") });
        case "search":
            return memoryApiRequest("POST", memoryEndpointUrl("memories/search"), {
                query: requiredToolArgument(args, "query"),
                ...(args.numberOfHits === undefined ? {} : { numberOfHits: args.numberOfHits }),
                ...(args.page === undefined ? {} : { page: args.page }),
                ...(args.filters === undefined ? {} : { filters: args.filters })
            });
        case "related":
            return memoryApiRequest("GET", memoryEndpointUrl(`memories/${encodeURIComponent(requiredToolArgument(args, "memory_id"))}/related`, {
                page: args.page,
                size: args.size
            }));
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
        lines.push("", "OAuth userinfo:", `- endpoint: ${userInfoResult.url}`, `- HTTP: ${userInfoResult.response.status}`);
    }
    return lines.join("\n");
}
async function verifiedAuthStatus(accessToken, context, tokenInfo = {}) {
    let userInfoResult;
    try {
        userInfoResult = await fetchUserInfoForToken(accessToken, await metadataForToken(tokenInfo));
    }
    catch (error) {
        userInfoResult = { error: asError(error) };
    }
    let appSession;
    try {
        appSession = await acquireAppSession(tokenInfo.cached || { access_token: accessToken });
    }
    catch (error) {
        appSession = { error };
    }
    const sessionResult = "token" in appSession && appSession.token
        ? await fetchSessionForAppSession(appSession).catch((error) => ({ error }))
        : { error: appSession.error };
    if (userInfoResult && "response" in userInfoResult && userInfoResult.response.ok) {
        return formatUserInfoStatus(userInfoResult.body, context, tokenInfo, "response" in sessionResult ? sessionResult : undefined);
    }
    if ("response" in sessionResult && (0, runtime_utils_1.isAuthenticatedSessionResult)(sessionResult)) {
        return formatSessionStatus(sessionResult, context, tokenInfo, userInfoResult && "response" in userInfoResult ? userInfoResult : undefined);
    }
    const userInfoRejected = userInfoResult && "response" in userInfoResult && userInfoResult.response.status === 401;
    const sessionRejected = "response" in sessionResult &&
        (sessionResult.response.status === 401 || sessionResult.response.status === 403);
    const lines = [
        `${userInfoRejected || sessionRejected ? "Auth status: token unauthenticated" : "Auth status: unknown"} (${context})`
    ];
    if (userInfoResult && "response" in userInfoResult) {
        lines.push(`OAuth userinfo endpoint ${userInfoResult.url} returned HTTP ${userInfoResult.response.status}.`);
        lines.push(`Response: ${JSON.stringify(userInfoResult.body)}`);
    }
    else if (userInfoResult && "error" in userInfoResult) {
        lines.push(`OAuth userinfo verification failed: ${userInfoResult.error.message}`);
    }
    else {
        lines.push("OAuth metadata did not provide a userinfo endpoint.");
    }
    if ("response" in sessionResult) {
        lines.push(...formatSessionReadiness(sessionResult));
    }
    else if ("error" in sessionResult) {
        lines.push(`App session check failed: ${sessionResult.error.message}`);
    }
    return lines.join("\n");
}
async function authStatusSummary() {
    const tokenInfo = await currentAccessToken();
    if (!tokenInfo?.token) {
        return "Auth status: unauthenticated (no cached or configured access token).";
    }
    return verifiedAuthStatus(tokenInfo.token, tokenInfo.source || "unknown", tokenInfo);
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
        const toolset = configuredToolset();
        const localName = unprefixedToolName(name) || name;
        if (toolset === "memory" && memoryTools.some((tool) => tool.name === localName)) {
            sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await callMemoryTool(localName, args)) });
            return;
        }
        if (localName === "read_case_file") {
            sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await readCaseFileTool(args)) });
            return;
        }
        if (localName === "get") {
            sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await getCaseFileTool(args)) });
            return;
        }
        if (localName === "amend") {
            sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await amendCaseFileTool(args)) });
            return;
        }
        if (localName === "embed") {
            sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await manageCaseFileEmbeddingsTool(args)) });
            return;
        }
        if (localName in graphToolAliases) {
            sendToClient({ jsonrpc: "2.0", id, result: await callNeo4jGraphTool(localName, args) });
            return;
        }
        if (localName === "call_api") {
            sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await callApiTool(args)) });
            return;
        }
        if (toolset !== "utils" && memoryTools.some((tool) => tool.name === localName)) {
            sendToClient({ jsonrpc: "2.0", id, result: jsonToolResult(await callMemoryTool(localName, args)) });
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
            }
            else if (listType === "resources") {
                const [resources, templates] = await Promise.all([
                    listResources().catch(() => []),
                    listResourceTemplates().catch(() => [])
                ]);
                sendToClient({ jsonrpc: "2.0", id, result: textToolResult(formatResourceDirectory(resources, templates)) });
            }
            else {
                sendToClient(errorResponse(id, -32602, "type must be one of: abilities, resources"));
            }
            return;
        }
        if (localName === "auth") {
            if (args?.action === "clear-cache") {
                sendToClient({ jsonrpc: "2.0", id, result: textToolResult(await clearCachedToken()) });
            }
            else if (args?.action === "status") {
                sendToClient({ jsonrpc: "2.0", id, result: textToolResult(await authStatusSummary()) });
            }
            else if (args?.action === "login") {
                sendToClient({ jsonrpc: "2.0", id, result: textToolResult(await loginAndSummarizeStatus()) });
            }
            else {
                sendToClient(errorResponse(id, -32602, "action must be one of: status, clear-cache, login"));
            }
            return;
        }
        sendToClient(errorResponse(id, -32601, `Unknown helper tool ${name}`));
    }
    catch (error) {
        sendToClient(errorResponse(id, -32000, asError(error).message));
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
        sendToClient({ jsonrpc: "2.0", id: message.id, result: { tools: listTools() } });
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
    }
    catch (error) {
        sendToClient(errorResponse(message.id, -32000, asError(error).message));
    }
}
function bindJsonLines(stream, onMessage, source) {
    const reader = (0, node_readline_1.createInterface)({ input: stream });
    reader.on("line", (line) => {
        if (!line.trim()) {
            return;
        }
        try {
            const message = JSON.parse(line);
            log(`received ${source} message`, summarizeMessage(message));
            onMessage(message);
        }
        catch (error) {
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
            }
            else {
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
//# sourceMappingURL=entrypoint.js.map