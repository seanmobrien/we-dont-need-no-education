---
name: compliance-theater
description: Use Compliance Theater 2000 for education compliance case-file, policy, evidence, memory, and workspace tasks. Trigger when the user mentions Compliance Theater, case files, case documents, policy search, compliance evidence, violations, key points, calls to action, responsive actions, case workspaces, or plugin authentication/status.
---

# Compliance Theater

Use this skill when a task should use Compliance Theater tools or resources.

## Normal Workflow

1. Use the installed Compliance Theater plugin tools directly.
2. When the user approves a case-file, policy, memory, or workspace action, treat that approval as covering the wrapper's internal auth/session work needed to complete that action.
3. Do not run a separate auth/status preflight before ordinary reads. Call the requested native tool directly; the wrapper handles cached auth, token wrapping, search, retrieval, and forwarding.
4. If a native tool reports that login is required, call `mcp_resource_auth_manage_auth` with `action: "login"`.
5. When a device authorization URL or user code is returned, immediately tell the user the URL/code and ask them to authenticate. Wait for the user's confirmation or the tool's login result before continuing.
6. Use case-file, policy, memory, or workspace tools according to the task. Do not inspect plugin cache files, wrapper scripts, `.mcp.json`, environment variables, or transport internals unless the user is explicitly debugging the plugin.
7. Treat Compliance Theater calls as potentially long-running. The wrapper defaults protected upstream calls to a 360 second timeout; do not abandon a call early unless it fails or the user interrupts.
8. Cite the tool name and important document IDs or workspace IDs used.

## Native Plugin Tools

Prefer the installed plugin tools directly. The wrapper hides upstream transport, OAuth/device login, wrapped app sessions, and token-cache details.

The plugin exposes Compliance Theater capabilities as native plugin tools. Each native tool authenticates as needed, forwards the request through the wrapper, and returns the result. Do not ask Codex to list MCP resources, inspect MCP configuration, or call transport-level helper paths during normal case-file, policy, memory, or workspace work.

Read-only tools such as `searchCaseFile`, `searchPolicyStore`, `getMultipleCaseFileDocuments`, `getCaseFileDocumentIndex`, `getCaseWorkspace`, and `readWorkspaceFile` are annotated as read-only/idempotent where applicable. Once the user asks to load or search a case file, proceed with the relevant read-only calls without asking for separate permission for auth wrapping, search, or document retrieval.

If you are unsure which native Compliance Theater tool to use, call `selectComplianceTools` with the user's goal and then call one of the returned native tools directly.

The wrapper also exposes memory API tools backed by the configured app host:

- `listMemories`, `createMemory`, `getMemoryCategories`, `getMemory`, `updateMemory`, `searchMemories`, `getRelatedMemories`

Use `mcp_resource_auth_manage_auth` for login, status, and cache maintenance when authentication needs attention. Do not call or describe backend endpoints unless the user is debugging the plugin itself.

## Source Preference

Treat "case file" as a routing hint for Compliance Theater. When the user refers to a case file, case document, case workspace, policy basis, key point, call to action, responsive action, or compliance-oriented evidence analysis, prefer Compliance Theater search and retrieval tools before PST search, Gmail search, or local index search.

Compliance Theater case-file data is built from the same Gmail source corpus but adds specialized vector-based search, structured case-file metadata, linked document context, extracted compliance details, and workspace state that raw email or local indexes may not expose reliably.

For case-file work:

- Use `searchCaseFile` when identifying relevant case-file material from a query, issue description, person, or compliance concern.
- Use `getMultipleCaseFileDocuments` when the user names document IDs or when detailed review of identified case-file documents is needed.
- Provide retrieval goals for large case-file documents unless the task requires high verbatim fidelity.
- Use policy tools when the user needs policy grounding or policy-basis research rather than raw case evidence alone.

Use PST, Gmail, or local index search when the user explicitly asks for the raw source view, when Compliance Theater cannot find the needed material, or when the task requires verifying the processed case-file representation against the original email or attachment.

## Authentication Pattern

Authentication should feel like normal plugin login, not backend setup. The wrapper manages OAuth discovery, token caching, wrapped app sessions, and endpoint derivation.

- Call native Compliance Theater tools first for normal work; they perform cached auth and session wrapping internally.
- Use `mcp_resource_auth_manage_auth` with `action: "status"` only when the user asks about login state or a tool reports an auth problem.
- Use `action: "login"` when a tool call reports authentication failure or status says unauthenticated.
- If the login flow returns a device authorization URL or user code, show it to the user and wait for authentication before continuing.
- Use `action: "clear-cache"` only when the user asks to reset login state or stale credentials are suspected.
- Never print tokens, client secrets, cookies, or raw credential values.
- Treat transport, cache, server URL, and wrapper script details as implementation internals unless the user is explicitly debugging the plugin.
