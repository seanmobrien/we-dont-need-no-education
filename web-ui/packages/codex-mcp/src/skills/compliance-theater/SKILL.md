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

- `case file`, `case document`: use compliance-theater-case-file or compliance-theater-search for search/retrieval. Search filter mapping: `email`, `attachment`, `core-document`, `note`.
- `case workspace`: use compliance-theater-case-workspace tools.
- `policy basis`: use policy search first, then case-file evidence if facts are needed.
- `key point`: maps to case-file search scope `key-point`.
- `call to action`: maps to case-file search scope `call-to-action`.
- `responsive action`: maps to case-file search scope `responsive-action`.
- `case note`: maps to case-file search scope `note`.
- `compliance theater`: use all compliance theater tools as needed.

## Tool Search

Compliance Theater is split into small namespace servers with OpenAI Tool Search support. If tool search is available, use it to discover the narrowest matching namespace instead of loading every Compliance Theater tool.

## Namespace Servers

`compliance-theater`

General compliance planning support.

- `sequentialthinking`: structured planning for complex compliance analysis.  Use for multi-step reasoning and comprehensive retrieval and analysis.  Useful when the user asks for a plan, checklist, a structured approach to a compliance task, or an analysis that requires integrating multiple sources of information.

`compliance-theater-search`

Search, index, embedding, and graph tools for policy sources, case-file evidence, and Neo4j relationship traversal.

- `policy`: search policy sources. Policy scope filters: `school-district`, `state`, `federal`.
- `case_file`: search case-file evidence. Case-file scope filters: `email`, `attachment`, `core-document`, `key-point`, `call-to-action`, `responsive-action`, `note`.
- `index`: list case-file document IDs and metadata, optionally by case-file scope.
- `embed`: read or generate case-file embeddings. Use `modelSize: "small"` by default. Use `large` only when the user asks for larger vectors or high-recall/high-fidelity vector work. Prefer `action: "read"` before generation unless the task specifically asks to compute or refresh embeddings. Use `action: "query-vectors"` to retrieve vectors for advanced query scenarios.
- `graph_schema`: inspect Neo4j graph labels, relationship types, and property keys before writing graph queries.
- `graph_read`: run read-only Cypher for relationship traversal, graph-backed evidence exploration, or validating graph shape.
- `graph_write`: run write-capable Cypher. Use only when the user explicitly asks to create, update, or delete graph data.

Graph tools use a plugin-hosted Neo4j MCP backend. The wrapper can auto-discover concrete graph credentials from the authenticated app session and cache them until the session token expires; if discovery is disabled, unavailable, or returns `env:` placeholders, it falls back to explicit plugin settings. If Neo4j settings are missing or the backend cannot start, surface the non-secret setup error to the user.

For vector search against Neo4j:

- Use `embed` with `action: "query-vectors"` to convert the user's query text into vectors before writing the Cypher query.
- Size guidance: use `modelSize: "small"` for target vector columns with 1056 dimensions, use `modelSize: "large"` for 3072 dimensions, and default to `small` when the target dimension is unknown.
- Pass the resulting vector values as Cypher parameters to `graph_read`.

`compliance-theater-case-files`

Case-file document retrieval and amendment tools.

- `get`: retrieve case-file documents.
- `amend`: amend structured case-file document details, ratings, notes, and relationships.

`get` behavior:

- Use `mode: "direct"` for full-fidelity, unsummarized reads when the user names up to three case-file IDs. Pass `caseFileId` for one ID or `ids` for multiple IDs. Direct mode has a maximum of 3 IDs.
- Use `mode: "goals"` for larger batches or when the user needs extraction, synthesis, or task-specific preprocessing. Provide `requests` when individual documents need different goals; provide shared `goals` when all requested documents should be processed the same way.
- Use `verbatim_fidelity` in goals mode when the user cares about quote fidelity or source-near output.

`compliance-theater-case-workspace`

Case workspace state, task, question, document-summary, and session-log tools.

- `get`: return a case workspace summary.
- `read`: read `overview`, `tasks`, `documentSummaries`, `openQuestions`, `timelineNotes`, `sessionLog`, or `metadata`.
- `append_task`: add a workspace task.
- `update_status`: change task status.
- `update_details`: update task title, description, priority, owner, or tags.
- `upsert`: create or update a document summary.
- `insert_question`: add a factual, legal, evidentiary, or process question.
- `update_question`: update question status or notes.
- `log`: add a session-log entry.
- `compact`: compact metadata and regenerate workspace projections.

`compliance-theater-memory`

Persistent memory tools for prior context, learned facts, categories, and related memory lookups.

- `list`: list persisted memories.
- `insert`: create a memory.
- `categories`: list memory categories.
- `get`: retrieve a memory by ID.
- `update`: update memory content.
- `search`: search memories.
- `related`: retrieve memories related to a memory ID.

`compliance-theater-todo`

Compliance-oriented todo list and task workflow tools.

- `insert`: create or replace a compliance-oriented todo list.
- `get`: read todo lists, optionally filtered by completion state or list ID.
- `update`: update a todo item.
- `toggle`: advance a todo through its completion workflow.

`compliance-theater-utils`

Authenticated utility tools for API escape hatches, resource inspection, and auth/session operations.

- `call_api`: call an authenticated Compliance Theater app API route relative to `/api`. Prefer dedicated tools when they exist.
- `list`: list abilities or resources. Use for inspection/debugging, not ordinary task routing.
- `auth`: check status, clear cache, or login.

## Authentication

1. Tools manage authentication inline.
2. When a device authorization URL or user code is returned, immediately tell the user the URL and code and ask them to authenticate. Wait for the user's confirmation or the tool's login result before continuing.
3. Use `auth` with `action: "status"` to retrieve session status and details if the user requests login/session status.
4. Never print tokens, client secrets, cookies, or raw credential values.

## Troubleshooting

If calls fail with auth-related issues:

1. Call `auth` with `action: "clear-cache"`.
2. Call `auth` with `action: "login"`.
3. Retry the failed call.
4. If authentication failure persists, surface the failure to the user with the relevant non-secret error details.
