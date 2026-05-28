"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utilityTools = exports.searchHelperTools = exports.graphToolAliases = exports.coreHelperTools = exports.caseFileTools = exports.readCaseFileOutputSchema = void 0;
const schema_utils_1 = require("./schema-utils");
exports.readCaseFileOutputSchema = (0, schema_utils_1.objectSchema)({
    isError: { type: "boolean", description: "Whether the app route reported an error." },
    value: (0, schema_utils_1.objectSchema)({
        case_file: (0, schema_utils_1.objectSchema)({
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
exports.caseFileTools = [
    {
        name: "get",
        description: "Retrieve case-file documents either directly without preprocessing or through goal-based batch extraction.",
        inputSchema: (0, schema_utils_1.objectSchema)({
            mode: {
                type: "string",
                enum: ["direct", "goals"],
                description: "direct returns full-fidelity unsummarized documents, up to 3 IDs; goals uses the batch preprocessor with optional goals and fidelity."
            },
            caseFileId: { ...schema_utils_1.stringOrNumberSchema, description: "Single case-file ID. Convenience alias for ids with one item." },
            ids: { type: "array", items: schema_utils_1.stringOrNumberSchema, description: "Case-file IDs to retrieve. Direct mode allows at most 3 IDs." },
            requests: (0, schema_utils_1.arrayOf)((0, schema_utils_1.objectSchema)({
                caseFileId: { ...schema_utils_1.stringOrNumberSchema, description: "Case-file document ID to retrieve." },
                goals: { type: "array", items: { type: "string" }, description: "Document-specific extraction or summary goals." },
                verbatimFidelity: { type: "number", minimum: 1, maximum: 100, description: "Document-specific fidelity override." }
            }, ["caseFileId"])),
            goals: { type: "array", items: { type: "string" }, description: "Shared extraction or summary goals for goals mode." },
            verbatim_fidelity: { type: "number", minimum: 1, maximum: 100, description: "Shared fidelity target for goals mode." }
        }, ["mode"]),
        outputSchema: (0, schema_utils_1.objectSchema)({
            mode: { type: "string", enum: ["direct", "goals"] },
            items: {
                type: "array",
                items: (0, schema_utils_1.objectSchema)({
                    caseFileId: schema_utils_1.stringOrNumberSchema,
                    result: exports.readCaseFileOutputSchema
                }, ["caseFileId", "result"])
            },
            result: { description: "Batch/goals mode response from getMultipleCaseFileDocuments." }
        }, ["mode"], true)
    },
    {
        name: "amend",
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
    }
];
exports.coreHelperTools = [
    {
        name: "read_case_file",
        description: "Retrieve one full-fidelity, unsummarized case file by ID from the Compliance Theater app. Useful for loading one complete case file at a time without MCP summarization or preprocessing.",
        inputSchema: (0, schema_utils_1.objectSchema)({
            caseFileId: {
                ...schema_utils_1.stringOrNumberSchema,
                description: "Case-file ID to retrieve. May be a numeric document/unit ID or a GUID accepted by the app's document-unit API."
            }
        }, ["caseFileId"]),
        outputSchema: exports.readCaseFileOutputSchema
    }
];
const graphVectorParamsSchema = {
    type: "object",
    additionalProperties: {
        anyOf: [
            { type: "string" },
            (0, schema_utils_1.objectSchema)({
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
};
const graphToolInputSchemas = {
    graph_schema: (0, schema_utils_1.objectSchema)({
        properties: { type: "object" }
    }, ["properties"]),
    graph_read: (0, schema_utils_1.objectSchema)({
        query: { type: "string" },
        params: {
            type: "object",
            description: "Cypher parameters. To materialize a query embedding inline, set a parameter value to { \"$embed\": \"query text\", \"modelSize\": \"small\" }."
        },
        vectorParams: graphVectorParamsSchema
    }, ["query"]),
    graph_write: (0, schema_utils_1.objectSchema)({
        query: { type: "string" },
        params: {
            type: "object",
            description: "Cypher parameters. To materialize a query embedding inline, set a parameter value to { \"$embed\": \"query text\", \"modelSize\": \"small\" }."
        },
        vectorParams: graphVectorParamsSchema
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
    },
    {
        name: "graph_embed",
        description: "Embed text for one or more Neo4j nodes and update their vector property. Reads the source text from a node property unless textValue is provided, in which case it updates that text property and embeds the provided value.",
        inputSchema: (0, schema_utils_1.objectSchema)({
            textColumnName: {
                type: "string",
                default: "content",
                description: "Node property containing text to embed. Defaults to content."
            },
            text_column_name: {
                type: "string",
                description: "Alias for textColumnName."
            },
            vectorColumnName: {
                type: "string",
                default: "embedding",
                description: "Node property to update with the embedding vector. Defaults to embedding."
            },
            vector_column_name: {
                type: "string",
                description: "Alias for vectorColumnName."
            },
            idColumnName: {
                type: "string",
                description: "Node property used to identify target node(s)."
            },
            id_column_name: {
                type: "string",
                description: "Alias for idColumnName."
            },
            idValue: {
                description: "Value matched against idColumnName."
            },
            id_value: {
                description: "Alias for idValue."
            },
            nodeType: {
                type: "string",
                description: "Optional Neo4j node label to constrain the update."
            },
            node_type: {
                type: "string",
                description: "Alias for nodeType."
            },
            textValue: {
                type: "string",
                description: "Optional replacement text. When provided, graph_embed updates textColumnName to this value and embeds it."
            },
            text_value: {
                type: "string",
                description: "Alias for textValue."
            },
            otherFields: {
                anyOf: [
                    { type: "string" },
                    { type: "array", items: { type: "string" } }
                ],
                description: "Optional extra node property name or names to append to the embedding input."
            },
            other_fields: {
                anyOf: [
                    { type: "string" },
                    { type: "array", items: { type: "string" } }
                ],
                description: "Alias for otherFields."
            },
            updateMultiple: {
                type: "boolean",
                default: false,
                description: "Set true to allow updating multiple matching nodes. When false, graph_embed verifies the id match returns exactly one node before writing."
            },
            update_multiple: {
                type: "boolean",
                description: "Alias for updateMultiple."
            },
            size: {
                type: "string",
                enum: ["large", "small"],
                default: "small",
                description: "Embedding model size to request. Defaults to small."
            }
        }, [], true)
    }
];
exports.graphToolAliases = {
    graph_schema: "get-schema",
    graph_read: "read-cypher",
    graph_write: "write-cypher"
};
exports.searchHelperTools = [
    {
        name: "embed",
        description: "Read or generate chunked vector embeddings for a single case file through the Compliance Theater app document-unit embeddings API.",
        inputSchema: (0, schema_utils_1.objectSchema)({
            caseFileId: {
                ...schema_utils_1.stringOrNumberSchema,
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
        outputSchema: (0, schema_utils_1.objectSchema)({
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
exports.utilityTools = [
    {
        name: "call_api",
        description: "Call an authenticated Compliance Theater app API endpoint. Provide a URL relative to the configured app host's /api path, such as document-unit/8 or memory/memories/. The wrapper sends the request with its wrapped app session cookies and returns the response.",
        inputSchema: (0, schema_utils_1.objectSchema)({
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
        outputSchema: (0, schema_utils_1.objectSchema)({
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
        inputSchema: (0, schema_utils_1.objectSchema)({
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
//# sourceMappingURL=helper-tool-schemas.js.map