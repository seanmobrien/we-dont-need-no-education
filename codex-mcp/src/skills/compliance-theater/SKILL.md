---
name: compliance-theater
description: Use Compliance Theater 2000 for education compliance case-file, policy, evidence, memory, and workspace tasks. Trigger when the user mentions Compliance Theater, case files, case documents, policy search, compliance evidence, violations, key points, calls to action, responsive actions, case notes, case workspaces, or plugin authentication/status.
---

# Compliance Theater

Use this skill to support education compliance investigations, policy grounding, evidence review, case-file analysis, case workspace management, compliance task tracking, and memory-backed continuity across related work.

## Normal Workflow

1. When the user approves a case-file, policy, memory, or workspace action, treat that approval as covering the wrapper's internal auth/session work needed to complete that action.
2. Treat Compliance Theater calls as potentially long-running. The protected upstream timeout is 360 seconds; do not abandon a call early unless it fails or the user interrupts.
3. Cite the tool name and important document IDs, case-file IDs, or workspace IDs used.
4. Treat Compliance Theater routing hints as reasons to prefer these tools before PST search, Gmail search, or local index search unless the user explicitly asks for the raw source view.

Routing hints include:

- `case file`, `case document`: use ```compliance_theater_case_files``` or ```compliance_theater_search``` MCP servers for search/retrieval. Search filter mapping: `email`, `attachment`, `core-document`, `note`.
- `case workspace`: use tools exposed by the ```compliance_theater_case_workspace``` MCP server.
- `policy basis`: use policy search in ```compliance_theater_search``` MCP server first, then case-file evidence from ```compliance_theater_case_files``` MCP server if facts are needed.
- `key point`: maps to case-file search scope `key-point`.
- `call to action`: maps to case-file search scope `call-to-action`.
- `responsive action`: maps to case-file search scope `responsive-action`.
- `case note`: maps to case-file search scope `note`.
- `compliance theater`: use all ```compliance_theater**``` MCP Server tools as needed.

## Tool Search

Compliance Theater is split into small MCP servers with focused toolsets. When the user mentions a relevant MCP server or tool, prefer that tool for retrieval, analysis, or action. For example:
- If the user asks for a case workspace summary, prefer ```compliance_theater_case_workspace.get``` over ```compliance_theater_search``` or local index search.
- If the user asks for policy references related to a case document, prefer ```compliance_theater_search_policy``` and ```compliance_theater_case_files_get``` over local index search or Gmail search.

## MCP Servers

`compliance_theater`

General compliance planning support.

- `sequentialthinking`: structured planning for complex compliance analysis.  Use for multi-step reasoning and comprehensive retrieval and analysis.  Useful when the user asks for a plan, checklist, a structured approach to a compliance task, or an analysis that requires integrating multiple sources of information.

`compliance_theater_search`

Search, index, embedding, and graph tools for policy sources, case-file evidence, and Neo4j relationship traversal.

- `compliance_theater_search_policy`: search policy sources. Policy scope filters: `school-district`, `state`, `federal`.
- `compliance_theater_search_case_file`: search case-file evidence. Case-file scope filters: `email`, `attachment`, `core-document`, `key-point`, `call-to-action`, `responsive-action`, `note`.
- `compliance_theater_search_index`: list case-file document IDs and metadata, optionally by case-file scope.
- `compliance_theater_search_embed`: read or generate case-file embeddings. Use `modelSize: "small"` by default. Use `large` only when the user asks for larger vectors or high-recall/high-fidelity vector work. Prefer `action: "read"` before generation unless the task specifically asks to compute or refresh embeddings. Use `action: "query-vectors"` to retrieve vectors for advanced query scenarios.
- `compliance_theater_search_graph_schema`: inspect Neo4j graph labels, relationship types, and property keys before writing graph queries.
- `compliance_theater_search_graph_read`: run read-only Cypher for relationship traversal, graph-backed evidence exploration, or validating graph shape.
- `compliance_theater_search_graph_write`: run write-capable Cypher. Use only when the user explicitly asks to create, update, or delete graph data.

Graph tools use a plugin-hosted Neo4j MCP backend. The wrapper can auto-discover concrete graph credentials from the authenticated app session and cache them until the session token expires; if discovery is disabled, unavailable, or returns `env:` placeholders, it falls back to explicit plugin settings. If Neo4j settings are missing or the backend cannot start, surface the non-secret setup error to the user.

For vector search against Neo4j:

- Use `embed` with `action: "query-vectors"` to convert the user's query text into vectors before writing the Cypher query.
- Prefer `graph_read` / `graph_write` vector parameter materialization for arbitrary Cypher:
  - Top-level form: pass `vectorParams: { "queryVector": { "text": "bias", "modelSize": "small" } }`; the tool embeds the text and injects the vector into `params.queryVector` before running Cypher.
  - Inline params form: pass `params: { "queryVector": { "$embed": "bias", "modelSize": "small" } }`; the explicit `$embed` marker is required so ordinary object params are not transformed accidentally.
- Use `graph_embed` to update a node text/vector pair in one tool call. It reads text from `textColumnName` (`content` by default), writes vectors to `vectorColumnName` (`embedding` by default), and requires `idColumnName` plus `idValue`; pass `textValue` to update the text property before embedding it.
- Unless `update_multiple` / `updateMultiple` is `true`, `graph_embed` first verifies that the id match resolves to exactly one node.
- Size guidance: use `modelSize: "small"` for 1536-dimension `text-embedding-3-small` target vector columns, use `modelSize: "large"` for larger target dimensions, and default to `small` when the target dimension is unknown.
- Do not paste large vector arrays into chat unless explicitly requested; let graph vector params materialize them.

`compliance_theater_case_files`

Case-file document retrieval and amendment tools.

- `compliance_theater_case_files_get`: retrieve case-file documents.
- `compliance_theater_case_files_amend`: amend structured case-file document details, ratings, notes, and relationships.

`compliance_theater_case_files_get` behavior:

- Use `mode: "direct"` for full-fidelity, unsummarized reads when the user names up to three case-file IDs. Pass `caseFileId` for one ID or `ids` for multiple IDs. Direct mode has a maximum of 3 IDs.
- Use `mode: "goals"` for larger batches or when the user needs extraction, synthesis, or task-specific preprocessing. Provide `requests` when individual documents need different goals; provide shared `goals` when all requested documents should be processed the same way.
- Use `verbatim_fidelity` in goals mode when the user cares about quote fidelity or source-near output.

`compliance_theater_case_workspace`

Case workspace state, task, question, document-summary, and session-log tools.

- `compliance_theater_case_workspace_get`: return a case workspace summary.
- `compliance_theater_case_workspace_read`: read `overview`, `tasks`, `documentSummaries`, `openQuestions`, `timelineNotes`, `sessionLog`, or `metadata`.
- `compliance_theater_case_workspace_append_task`: add a workspace task.
- `compliance_theater_case_workspace_update_status`: change task status.
- `compliance_theater_case_workspace_update_details`: update task title, description, priority, owner, or tags.
- `compliance_theater_case_workspace_upsert`: create or update a document summary.
- `compliance_theater_case_workspace_insert_question`: add a factual, legal, evidentiary, or process question.
- `compliance_theater_case_workspace_update_question`: update question status or notes.
- `compliance_theater_case_workspace_log`: add a session-log entry.
- `compliance_theater_case_workspace_compact`: compact metadata and regenerate workspace projections.

`compliance_theater_memory`

Persistent memory tools for prior context, learned facts, categories, and related memory lookups.

- `compliance_theater_memory_list`: list persisted memories.
- `compliance_theater_memory_insert`: create a memory.
- `compliance_theater_memory_categories`: list memory categories.
- `compliance_theater_memory_get`: retrieve a memory by ID.
- `compliance_theater_memory_update`: update memory content.
- `compliance_theater_memory_search`: search memories.
- `compliance_theater_memory_related`: retrieve memories related to a memory ID.

`compliance_theater_todo`

Compliance-oriented todo list and task workflow tools.

- `compliance_theater_todo_insert`: create or replace a compliance-oriented todo list.
- `compliance_theater_todo_get`: read todo lists, optionally filtered by completion state or list ID.
- `compliance_theater_todo_update`: update a todo item.
- `compliance_theater_todo_toggle`: advance a todo through its completion workflow.

`compliance_theater_utils`

Authenticated utility tools for API escape hatches, resource inspection, and auth/session operations.

- `compliance_theater_utils_call_api`: call an authenticated Compliance Theater app API route relative to `/api`. Prefer dedicated tools when they exist.
- `compliance_theater_utils_list`: list abilities or resources. Use for inspection/debugging, not ordinary task routing.
- `compliance_theater_utils_auth`: check status, clear cache, or login.

## Authentication

1. Tools manage authentication inline.
2. When a device authorization URL or user code is returned, immediately tell the user the URL and code and ask them to authenticate. Wait for the user's confirmation or the tool's login result before continuing.
3. Use `compliance_theater_utils_auth` or `compliance_theater_utils_auth` with `action: "status"` to retrieve session status and details if the user requests login/session status.
4. Never print tokens, client secrets, cookies, or raw credential values.

## Troubleshooting

If calls fail with auth-related issues:

1. Call `compliance_theater_utils_auth` with `action: "clear-cache"`.
2. Call `compliance_theater_utils_auth` with `action: "login"`.
3. Retry the failed call.
4. If authentication failure persists, surface the failure to the user with the relevant non-secret error details.
