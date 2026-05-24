
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
cd web-ui/packages/codex-mcp
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
    "path": "/absolute/path/to/we-dont-need-no-education/web-ui/packages/codex-mcp"
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

- `/home/seanm/repos/we-dont-need-no-education/web-ui/packages/codex-mcp`

Or, if using the published output:

- `/home/seanm/repos/we-dont-need-no-education/web-ui/packages/codex-mcp/publish`

## Environment Variables

The plugin manifest intentionally exposes only a small settings surface:

- `MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL` - the MCP SSE endpoint. Defaults to the hosted Compliance Theater service.
- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_SECRET` - optional, secure client secret for confidential clients.
- `MCP_COMPLIANCE_THEATER_RESOURCE_LOG_FILE` - optional wrapper diagnostics path.

Defaults cover the hosted SSE URL, issuer, client ID, and OAuth scope. Local development should usually override only `MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL`, for example with `http://localhost:3000/api/ai/tools/sse`.

Advanced auth overrides are still supported through `.mcp.json` and the wrapper environment contract, but they are deliberately not part of the default Codex settings UI:

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
- A local MCP server entrypoint in `.mcp.json` that launches compiled `scripts/oauth-mcp-wrapper.js`.
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

The plugin manifest and `.mcp.json` default to these values:

- Target MCP SSE URL: `https://full-ui.compliance-theater.obapps.net/api/ai/tools/sse`
- OAuth issuer: `https://login.obapps.net/realms/compliance-theater`
- OAuth client ID: `codex`
- OAuth scope: `openid`
The settings exposed in `.codex-plugin/plugin.json` map directly to environment variables so Codex can configure the plugin without modifying the wrapper script. The UI-facing settings are intentionally limited to the MCP endpoint, an optional secure client secret, and an optional log path.

The key UI-facing input is:

- `MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL`

Useful UI-facing optional inputs are:

- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_SECRET`
- `MCP_COMPLIANCE_THEATER_RESOURCE_LOG_FILE`

Advanced optional inputs include:

- `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_ISSUER`
- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_ID`
- `MCP_COMPLIANCE_THEATER_RESOURCE_OAUTH_SCOPE`
- `MCP_COMPLIANCE_THEATER_RESOURCE_ACCESS_TOKEN`
- `MCP_COMPLIANCE_THEATER_RESOURCE_REFRESH_TOKEN`
- `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_METADATA_URL`
- `MCP_COMPLIANCE_THEATER_RESOURCE_TOKEN_CACHE_PATH`
- `MCP_COMPLIANCE_THEATER_RESOURCE_DISABLE_TOKEN_CACHE`
- `MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_TIMEOUT_MS`
- `MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_RETRY_COUNT`
- `MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_RETRY_BASE_MS`
- `MCP_COMPLIANCE_THEATER_RESOURCE_PROXY_REQUEST_TIMEOUT_MS`
- `MCP_COMPLIANCE_THEATER_RESOURCE_DEVICE_CODE_TIMEOUT_SECONDS`

## Helper Tools Added By The Wrapper

The wrapper exposes a fixed native plugin tool surface over the authenticated proxy. Each exposed tool handles auth, forwards the request to the configured Compliance Theater service, and returns the result. The fixed catalog intentionally avoids runtime tool-discovery churn in normal model workflows.

The wrapper also adds app-session-backed memory API tools that call the configured app host:

- `listMemories`, `createMemory`, `getMemoryCategories`, `getMemory`, `updateMemory`, `searchMemories`, `getRelatedMemories`

The wrapper adds convenience tools alongside those native tools:

- `mcp_resource_auth_list_abilities`
  Returns a text summary of tool names, descriptions, schemas, and resource counts.
- `mcp_resource_auth_list_resources`
  Returns a directory-style listing of resources and resource templates.
- `mcp_resource_auth_manage_auth`
  Manages auth state with action-based operations:
  - `status`: inspects auth state, wraps the Keycloak bearer token when needed, and calls `/api/auth/session` with the app session cookie.
  - `clear-cache`: deletes the local cached token file.
  - `login`: runs an interactive login flow and caches a fresh token.
- `selectComplianceTools`
  Given a user goal, returns a short list of native Compliance Theater tools likely to help. This is a planning helper only; callers should then invoke the returned tools directly.

`mcp_resource_auth_manage_auth` status output behaves as follows:

- If no configured or cached token exists, it returns `unauthenticated`.
- If a token exists, it calls `[MCP Server]/api/auth/session` using `Authorization: Bearer <token>`.
- If session reports unauthenticated (or HTTP 401/403), it reports cached token unauthenticated.
- If session reports authenticated, it prints helpful details including user name, email, id/hash when present, expiry, scope, and resource-access permissions.

These are implemented in the wrapper itself and are useful even when the remote MCP server exposes a large surface area.

Protected upstream calls default to a 360 second proxy timeout because case-file retrieval, preprocessing, and policy search can be long-running.

## Runtime Utilities

`src/scripts/runtime-utils.ts` provides the shared mechanics used by the wrapper. The build emits `dist/scripts/runtime-utils.js` for the deployed wrapper:

- token expiry calculation and skew-aware cache reuse
- secure token cache writes under `~/.codex/mcp-resource-auth/` by default
- retry and exponential backoff for HTTP requests
- warnings for insecure non-loopback HTTP URLs
- SSE connection setup using `Authorization: Bearer ...`
- simple JSON-RPC request/response helpers over SSE

The accompanying `src/scripts/runtime-utils.test.mjs` covers the compiled utility output for retry policy, endpoint resolution, insecure URL warnings, and cache-expiry behavior.

## Bundled Skill

`src/skills/compliance-theater/SKILL.md` is the source skill file that tells Codex how to use this plugin responsibly.

The skill emphasizes:

- using installed Compliance Theater tools directly before guessing or searching elsewhere
- treating authentication as a simple plugin login/status flow
- avoiding printing secrets
- using the helper actions for login/status and optional goal-based tool selection
- allowing long-running case-file and policy calls to complete under the 360 second default timeout
- preferring narrow resource reads and read-only actions unless mutation is explicitly requested

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
