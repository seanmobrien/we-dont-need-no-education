
# @compliance-theater/codex-mcp

Codex plugin for MCP authentication and resource access.

## Project Structure

- `src/` — Canonical plugin source tree, including manifest, MCP config, runtime scripts, and skills
- `__tests__/` — Unit tests (Jest)
- `scripts/` — Package build tooling
- `dist/` — Install-ready plugin output generated from `src/`

## Build, Test, and Publish

From the monorepo root:

```sh
yarn turbo run build --filter=@compliance-theater/codex-mcp
yarn turbo run test --filter=@compliance-theater/codex-mcp
yarn turbo run lint --filter=@compliance-theater/codex-mcp
yarn turbo run build:publish --filter=@compliance-theater/codex-mcp
```

This will build the plugin, run unit tests, lint, and copy all distributable files to `publish/` for standalone use.

## Standalone Usage

```sh
cd codex-mcp
yarn install
yarn build
yarn test
yarn build:publish
```

## Install as a Codex Plugin

You can use this repository folder as the plugin source directly, or copy the contents of `publish/` to your Codex plugins directory.

### Marketplace Entry Example

Add an entry in your local marketplace JSON (for example, under your user-level Codex plugins marketplace file) that points to this repo path:

```
{
  "name": "compliance-theater-2000",
  "source": {
    "source": "local",
    "path": "/absolute/path/to/we-dont-need-no-education/codex-mcp"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

Use an absolute path for reliability.

On this repository checkout, the path would normally be:

- `/home/seanm/repos/we-dont-need-no-education/codex-mcp`

Or, if using the published output:

- `/home/seanm/repos/we-dont-need-no-education/codex-mcp/publish`

## Environment Variables

The plugin manifest intentionally exposes only a small settings surface:

- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_SECRET` - required, secure client secret for confidential clients.
- `MCP_COMPLIANCE_THEATER_RESOURCE_LOG_FILE` - optional wrapper diagnostics path.
- `MCP_COMPLIANCE_THEATER_NEO4J_URI` - optional Neo4j URI for graph tools.
- `MCP_COMPLIANCE_THEATER_NEO4J_USERNAME` - optional Neo4j username for graph tools.
- `MCP_COMPLIANCE_THEATER_NEO4J_PASSWORD` - optional, secure Neo4j password for graph tools.
- `MCP_COMPLIANCE_THEATER_NEO4J_DATABASE` - optional Neo4j database for graph tools.
- `MCP_COMPLIANCE_THEATER_NEO4J_AUTO_DISCOVERY` - optional graph credential discovery toggle; defaults to `true`.

The wrapper applies defaults for the hosted SSE URL, issuer, client ID, and OAuth scope. If you want to override those in Codex, add them through Environment variable passthrough or set them in the parent shell before starting Codex.

The most common passthrough overrides are:

- `MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL`
- `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_ISSUER`
- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_ID`
- `MCP_COMPLIANCE_THEATER_RESOURCE_OAUTH_SCOPE`

Advanced auth overrides are still supported through `servers.mcp.json` and the wrapper environment contract, but they are deliberately not part of the default Codex settings UI:

- `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_ISSUER`
- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_ID`
- `MCP_COMPLIANCE_THEATER_RESOURCE_OAUTH_SCOPE`

### 3. Optional: symlink a stable local plugin path

If your Codex setup prefers a single plugins directory, create a symlink that points back to this repo folder instead of copying files. This preserves a single source of truth while still giving a stable local plugin location.

### Why this is better than copying

- no duplicated plugin state
- immediate pickup of repo updates
- easier branch-based testing and rollback
- easier code review because install source and implementation are the same folder

## What This Plugin Is

- A Codex plugin definition in `.codex-plugin/plugin.json`.
- A local MCP server entrypoint in `servers.mcp.json` that launches compiled `scripts/oauth-mcp-wrapper.js`.
- An OAuth wrapper that discovers authorization metadata, acquires tokens, connects to the configured MCP SSE endpoint, and forwards JSON-RPC messages.
- A small runtime utility layer for retries, token cache management, SSE connection setup, and JSON-RPC over SSE.
- A bundled skill under deployed `skills/compliance-theater/` that tells Codex when and how to use the authenticated MCP server.

## Authenticated Connection Model

The most important behavior in this package lives in typed source file `src/scripts/oauth-mcp-wrapper.ts`. The build compiles it to deployed path `dist/scripts/oauth-mcp-wrapper.js`.

It supports authenticated MCP connections with this flow:

1. Read plugin settings and environment variables with the `MCP_COMPLIANCE_THEATER_RESOURCE_` prefix.
2. Resolve the target SSE URL, OAuth issuer, and client identity.
3. Try to reuse an existing access token in this order:
   - `ACCESS_TOKEN` from the environment
   - a cached token file
   - refresh-token flow
   - client-credentials flow
   - password grant
   - device-authorization flow
4. Discover OAuth metadata through RFC 8414 if explicit metadata is not supplied.
5. Exchange the Keycloak token for a wrapped app session when needed.
6. Connect to the configured SSE MCP endpoint.
7. Proxy JSON-RPC requests and responses between Codex and the remote MCP server.

The wrapper also supports dynamic client registration when the authorization server exposes a registration endpoint and no client ID is configured.

## Default Targets And Settings

The wrapper defaults to these values when the corresponding environment variables are not present:

- Target MCP SSE URL: `https://full-ui.compliance-theater.obapps.net/api/ai/tools/sse`
- OAuth issuer: `https://login.obapps.net/realms/compliance-theater`
- OAuth client ID: `codex`
- OAuth scope: `openid`
| Variable | Default | Description |
|---|---|---|
| `MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL` | `https://full-ui.compliance-theater.obapps.net/api/ai/tools/sse` | MCP SSE endpoint. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_ISSUER` | `https://login.obapps.net/realms/compliance-theater` | OAuth issuer URL (RFC 8414). |
| `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_ID` | `codex` | OAuth client ID. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_OAUTH_SCOPE` | `openid` | OAuth scope requested at token time. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_SECRET` | REQUIRED | OAuth client secret for confidential clients. Declared as a secure UI setting. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_ACCESS_TOKEN` | — | Pre-existing bearer token; skips token acquisition if set. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_REFRESH_TOKEN` | — | Refresh token used before falling back to interactive flows. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_METADATA_URL` | — | Override for the OAuth metadata discovery URL (RFC 8414). |
| `MCP_COMPLIANCE_THEATER_RESOURCE_TOKEN_CACHE_PATH` | `~/.codex/compliance-theater/token.json` | Path for the on-disk token cache. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_DISABLE_TOKEN_CACHE` | — | Set to `1` to disable on-disk token caching. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_TIMEOUT_MS` | `360000` | Timeout in ms for upstream HTTP requests. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_RETRY_COUNT` | `2` | Number of retries for failed HTTP requests. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_RETRY_BASE_MS` | `500` | Base delay in ms for exponential backoff retries. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_PROXY_REQUEST_TIMEOUT_MS` | `360000` | Timeout in ms for proxied MCP requests (case-file and policy calls can be long-running). |
| `MCP_COMPLIANCE_THEATER_RESOURCE_DEVICE_CODE_TIMEOUT_SECONDS` | `900` | Timeout in seconds for the device-authorization flow. |
| `MCP_COMPLIANCE_THEATER_RESOURCE_LOG_FILE` | `~/.codex/compliance-theater/compliance-theater-wrapper.log` | Wrapper diagnostics log path. Declared as a UI setting. |
| `MCP_COMPLIANCE_THEATER_NEO4J_URI` | — | Neo4j URI for graph tools. Declared as a plugin setting. |compliance-theater
| `MCP_COMPLIANCE_THEATER_NEO4J_USERNAME` | — | Neo4j username for graph tools. Declared as a plugin setting. |
| `MCP_COMPLIANCE_THEATER_NEO4J_PASSWORD` | — | Neo4j password for graph tools. Declared as a secure plugin setting. |
| `MCP_COMPLIANCE_THEATER_NEO4J_DATABASE` | — | Neo4j database for graph tools. Declared as a plugin setting. |
| `MCP_COMPLIANCE_THEATER_NEO4J_AUTO_DISCOVERY` | `true` | Enables graph credential discovery through `/api/memory/config?secrets=true` before falling back to explicit Neo4j settings. |

## Usage Model

This plugin supports education compliance investigations, policy grounding, evidence review, case-file analysis, case workspace management, compliance task tracking, and memory-backed continuity across related work.

The wrapper manages authentication inline. When a user approves a case-file, policy, memory, or workspace action, that approval covers the wrapper's internal auth/session work needed to complete the action. Protected upstream calls default to a 360 second timeout because case-file retrieval, preprocessing, and policy search can be long-running.

Use Compliance Theater before PST search, Gmail search, or local index search when a task mentions:

- `case file` or `case document`: use case-file search/retrieval. Search scope filters include `email`, `attachment`, `core-document`, and `note`.
- `case workspace`: use workspace tools.
- `policy basis`: use policy search first, then case-file evidence if facts are needed.
- `key point`: use case-file search scope `key-point`.
- `call to action`: use case-file search scope `call-to-action`.
- `responsive action`: use case-file search scope `responsive-action`.
- `case note`: use case-file search scope `note`.
- compliance-oriented evidence analysis: combine case-file search, case-file retrieval, and policy search as needed.

When reporting results, cite the tool name and important document IDs, case-file IDs, or workspace IDs used.

## Tool Search And Namespaces

The MCP config splits the tool surface into small namespace servers. Each server entry includes `defer_loading: true` plus a high-level description so OpenAI `tool_search` can discover only the relevant Compliance Theater namespace at runtime.

OpenAI Responses API callers should include `{ "type": "tool_search" }` in the request `tools` array when using deferred namespace discovery. The model can then choose, for example, `compliance-theater-search` for evidence discovery, `compliance-theater-case-files` for document reads/amendments, or `compliance-theater-case-workspace` for workspace state before individual tool schemas are loaded.

## Namespace Servers

### `compliance-theater`

General compliance planning support.

- `sequentialthinking`: structured planning for complex compliance analysis.

### `compliance-theater-search`

Search, index, embedding, and graph tools for policy sources, case-file evidence, and Neo4j relationship traversal.

- `policy`: search policy sources. Policy scope filters: `school-district`, `state`, `federal`.
- `case_file`: search case-file evidence. Case-file scope filters: `email`, `attachment`, `core-document`, `key-point`, `call-to-action`, `responsive-action`, `note`.
- `index`: list case-file document IDs and metadata, optionally by case-file scope.
- `embed`: read or generate case-file embeddings. Use `modelSize: "small"` by default; use `large` only for larger-vector or high-recall/high-fidelity vector work. Prefer `action: "read"` before generation unless the task specifically asks to compute or refresh embeddings. Use `action: "query-vectors"` to retrieve vectors for advanced query scenarios.
- `graph_schema`: inspect Neo4j graph labels, relationship types, and property keys before writing graph queries.
- `graph_read`: run read-only Cypher for relationship traversal, graph-backed evidence exploration, or validating graph shape.
- `graph_write`: run write-capable Cypher. Use only when the user explicitly asks to create, update, or delete graph data.

Graph tools are backed by a plugin-hosted Neo4j stdio MCP child server. Before launching it, the wrapper optionally discovers concrete graph credentials once per session with `GET /api/memory/config?secrets=true`; usable discovered credentials are cached under the wrapper cache directory until the session token expires. If discovery is disabled, fails, or returns `env:` placeholders, the wrapper falls back to explicit Neo4j plugin settings. The wrapper first tries `python -m neo4j_mcp_server`; if that cannot initialize, it falls back to `uvx neo4j-mcp-server`. It translates resolved settings into the child process's `NEO4J_*` environment and internally sets `NEO4J_READ_ONLY=false` and `NEO4J_TELEMETRY=false`.

### `compliance-theater-case-files`

Case-file document retrieval and amendment tools.

- `get`: retrieve case-file documents.
- `amend`: amend structured case-file document details, ratings, notes, and relationships.

`get` supports two modes:

- `mode: "direct"` returns full-fidelity, unsummarized reads for up to three case-file IDs. Pass `caseFileId` for one ID or `ids` for multiple IDs.
- `mode: "goals"` supports larger batches or task-specific extraction/synthesis. Provide `requests` for per-document goals, shared `goals` for common processing, and `verbatim_fidelity` when source-near output matters.

### `compliance-theater-case-workspace`

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

### `compliance-theater-memory`

Persistent memory tools for prior context, learned facts, categories, and related memory lookups.

- `list`: list persisted memories.
- `insert`: create a memory.
- `categories`: list memory categories.
- `get`: retrieve a memory by ID.
- `update`: update memory content.
- `search`: search memories.
- `related`: retrieve memories related to a memory ID.

### `compliance-theater-todo`

Compliance-oriented todo list and task workflow tools.

- `insert`: create or replace a compliance-oriented todo list.
- `get`: read todo lists, optionally filtered by completion state or list ID.
- `update`: update a todo item.
- `toggle`: advance a todo through its completion workflow.

### `compliance-theater-utils`

Authenticated utility tools for API escape hatches, resource inspection, and auth/session operations.

- `call_api`: call an authenticated Compliance Theater app API route relative to `/api`. Prefer dedicated tools when they exist.
- `list`: list abilities or resources. Use for inspection/debugging, not ordinary task routing.
- `auth`: check status, clear cache, or login.

## Authentication Behavior

Tools manage authentication inline. If a device authorization URL or user code is returned, show the URL and code to the user immediately and wait for their confirmation or the tool's login result before continuing.

Use `auth` with `action: "status"` to retrieve session status and details when the user asks. If calls fail with auth-related issues, use `auth` with `action: "clear-cache"`, then `auth` with `action: "login"`, then retry the failed call. If authentication failure persists, surface the non-secret error details to the user.

Never print tokens, client secrets, cookies, or raw credential values.

## Runtime Utilities

`src/scripts/runtime-utils.ts` provides the shared mechanics used by the wrapper. The build emits `dist/scripts/runtime-utils.js` for the deployed wrapper:

- token expiry calculation and skew-aware cache reuse
- secure token cache writes under `~/.codex/compliance-theater/` by default
- retry and exponential backoff for HTTP requests
- warnings for insecure non-loopback HTTP URLs
- SSE connection setup using `Authorization: Bearer ...`
- simple JSON-RPC request/response helpers over SSE

The accompanying `src/scripts/runtime-utils.test.mjs` covers the compiled utility output for retry policy, endpoint resolution, insecure URL warnings, and cache-expiry behavior.

## Bundled Skill

`src/skills/compliance-theater/SKILL.md` is the source skill file that tells Codex how to use this plugin responsibly.

The skill emphasizes:

- supporting education compliance investigations, policy grounding, evidence review, and case workspace management
- routing case-file, case-document, policy-basis, key-point, call-to-action, responsive-action, and case-note tasks to the appropriate namespace
- using OpenAI tool search to discover the narrowest matching deferred namespace when available
- treating authentication as inline tool behavior, with `auth` reserved for status checks and troubleshooting
- avoiding printing secrets
- allowing long-running case-file and policy calls to complete under the 360 second default timeout

## Operational Notes

- The wrapper writes interactive login prompts, device codes, and status messages to stderr so stdout remains clean JSON-RPC for Codex.
- The plugin caches access tokens on disk unless caching is disabled.
- The wrapper warns when the OAuth issuer or SSE endpoint uses insecure HTTP outside loopback hosts.

## Current Metadata Gaps

The plugin manifest already identifies this package as a Codex plugin for authenticated MCP access, but a few manifest URLs are still placeholders:

- homepage
- website URL
- privacy policy URL
- terms of service URL

If this plugin is intended for broader distribution, those should be replaced with real documentation and policy endpoints.

## Minimal Example

```bash
export MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL="https://full-ui.compliance-theater.obapps.net/api/ai/tools/sse"
export MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_ISSUER="https://login.obapps.net/realms/compliance-theater"
export MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_ID="codex"

yarn workspace @compliance-theater/codex-mcp build
node ./dist/scripts/oauth-mcp-wrapper.js
```

The wrapper will then acquire a bearer token if needed, wrap it into an app session when available, and proxy Codex traffic through the configured MCP SSE endpoint.
