"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staticRemoteTools = void 0;
const schema_utils_1 = require("./schema-utils");
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
exports.staticRemoteTools = [
    {
        name: "searchPolicyStore",
        description: "Search Compliance Theater policy sources with hybrid/vector search.",
        inputSchema: (0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({
            requests: (0, schema_utils_1.arrayOf)((0, schema_utils_1.objectSchema)({
                caseFileId: { ...schema_utils_1.stringOrNumberSchema, description: "Case-file document ID to retrieve." },
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
        inputSchema: (0, schema_utils_1.objectSchema)({
            scope: { type: "array", items: { type: "string", enum: caseFileScopes }, description: "Optional document type filters." }
        })
    },
    {
        name: "amendCaseFileDocument",
        description: "Amend structured case-file document details, ratings, notes, and relationships.",
        inputSchema: (0, schema_utils_1.objectSchema)({
            update: (0, schema_utils_1.objectSchema)({
                targetCaseFileId: { ...schema_utils_1.stringOrNumberSchema, description: "Case-file document ID to amend." },
                severityRating: { type: "number" },
                severityReasons: { type: "array", items: { type: "string" } },
                notes: { type: "array", items: { type: "string" } },
                complianceRating: { type: "number" },
                complianceReasons: { type: "array", items: { type: "string" } },
                completionRating: { type: "number", description: "Rates how close to fully complete the call to action is." },
                completionReasons: { type: "array", items: { type: "string" } },
                addRelatedDocuments: (0, schema_utils_1.arrayOf)((0, schema_utils_1.objectSchema)({
                    relatedToDocumentId: { type: "number", description: "Related document ID." },
                    relationshipType: { type: "string", description: "How the related document connects to the target document." }
                }, ["relatedToDocumentId", "relationshipType"])),
                associateResponsiveAction: (0, schema_utils_1.arrayOf)((0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({
            listId: { type: "string", description: "Optional stable list ID." },
            title: { type: "string", description: "Todo list title." },
            description: { type: "string", description: "Todo list description." },
            status: { type: "string", enum: ["pending", "active", "complete"], description: "List status." },
            priority: { type: "string", enum: ["high", "medium", "low"], description: "List priority." },
            todos: (0, schema_utils_1.arrayOf)((0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({
            completed: { type: "boolean", description: "Filter by completion state." },
            listId: { type: "string", description: "Optional list ID." }
        })
    },
    {
        name: "updateTodo",
        description: "Update an existing todo item.",
        inputSchema: (0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({ id: { type: "string", description: "Todo ID." } }, ["id"])
    },
    {
        name: "getCaseWorkspace",
        description: "Return a summary of a case workspace.",
        inputSchema: (0, schema_utils_1.objectSchema)({ caseId: { type: "string", description: "Case identifier." } }, ["caseId"])
    },
    {
        name: "readWorkspaceFile",
        description: "Read a case workspace file.",
        inputSchema: (0, schema_utils_1.objectSchema)({
            caseId: { type: "string", description: "Case identifier." },
            file: { type: "string", enum: workspaceFiles, description: "Workspace file to read." }
        }, ["caseId", "file"])
    },
    {
        name: "appendWorkspaceTask",
        description: "Append a task to a case workspace.",
        inputSchema: (0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({
            caseId: { type: "string" },
            taskId: { type: "string" },
            status: { type: "string", enum: taskStatuses },
            blockedReason: { type: "string" }
        }, ["caseId", "taskId", "status"])
    },
    {
        name: "updateWorkspaceTaskDetails",
        description: "Update editable fields on a case workspace task.",
        inputSchema: (0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({
            caseId: { type: "string" },
            questionId: { type: "string" },
            status: { type: "string", enum: questionStatuses },
            notes: { type: "string" }
        }, ["caseId", "questionId", "status"])
    },
    {
        name: "appendWorkspaceSessionLog",
        description: "Append a session log entry to a case workspace.",
        inputSchema: (0, schema_utils_1.objectSchema)({
            caseId: { type: "string" },
            actor: { type: "string", enum: ["system", "model", "user"] },
            summary: { type: "string" }
        }, ["caseId", "summary"])
    },
    {
        name: "compactWorkspace",
        description: "Compact workspace metadata and regenerate workspace markdown projections.",
        inputSchema: (0, schema_utils_1.objectSchema)({ caseId: { type: "string" } }, ["caseId"])
    }
];
//# sourceMappingURL=remote-tool-schemas.js.map