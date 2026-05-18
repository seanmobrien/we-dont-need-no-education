
# @compliance-theater/codex-mcp

Codex plugin for MCP authentication and resource access.

## Project Structure

- `src/` — Source code for plugin logic
- `__tests__/` — Unit tests (Jest)
- `.codex-plugin/` — Codex manifest and plugin metadata
- `scripts/` — Helper scripts for install, auth, etc.

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

Set these environment variables as needed:

- `MCP_COMPLIANCE_THEATER_RESOURCE_MCP_COMMAND`
- `MCP_COMPLIANCE_THEATER_RESOURCE_MCP_ARGS`
- `MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL`
- `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_ISSUER`
- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_ID`
- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_SECRET`
- `MCP_COMPLIANCE_THEATER_RESOURCE_OAUTH_SCOPE`

Defaults already cover common local values for issuer, client ID, OAuth scope, and local SSE URL.

### 3. Optional: symlink a stable local plugin path

If your Codex setup prefers a single plugins directory, create a symlink that points back to this repo folder instead of copying files. This preserves a single source of truth while still giving a stable local plugin location.

### Why this is better than copying

- no duplicated plugin state
- immediate pickup of repo updates
- easier branch-based testing and rollback
- easier code review because install source and implementation are the same folder

## What This Plugin Is

- A Codex plugin definition in `.codex-plugin/plugin.json`.
- A local MCP server entrypoint in `.mcp.json` that launches `scripts/oauth-mcp-wrapper.mjs`.
- An OAuth wrapper that discovers authorization metadata, acquires tokens, starts the child MCP server, and forwards JSON-RPC messages.
- A small runtime utility layer for retries, token cache management, SSE connection setup, and JSON-RPC over SSE.
- Smoke-test scripts for listing authenticated tools and resources from an SSE MCP endpoint.
- A bundled skill under `skills/mcp-resource-auth/` that tells Codex when and how to use the authenticated MCP server.

## Authenticated Connection Model

The most important behavior in this folder lives in `scripts/oauth-mcp-wrapper.mjs`.

It supports authenticated MCP connections with this flow:

1. Read plugin settings and environment variables with the `MCP_COMPLIANCE_THEATER_RESOURCE_` prefix.
2. Resolve the target SSE URL, OAuth issuer, client identity, and the real MCP server command to launch.
3. Try to reuse an existing access token in this order:
   - `ACCESS_TOKEN` from the environment
   - a cached token file
   - refresh-token flow
   - client-credentials flow
   - password grant
   - device-authorization flow
4. Discover OAuth metadata through RFC 8414 if explicit metadata is not supplied.
5. Start the child MCP server only after a usable token has been acquired.
6. Inject the access token into the child process environment.
7. Proxy JSON-RPC requests and responses between Codex and the child MCP server.

The wrapper also supports dynamic client registration when the authorization server exposes a registration endpoint and no client ID is configured.

## Default Targets And Settings

The plugin manifest and `.mcp.json` default to these values:

- Target MCP SSE URL: `http://localhost:3000/api/ai/tools/sse`
- OAuth issuer: `https://login.obapps.net/realms/compliance-theater`
- OAuth client ID: `codex`
- OAuth scope: `openid`
- Child access-token environment variable: `MCP_COMPLIANCE_THEATER_RESOURCE_ACCESS_TOKEN`

The settings exposed in `.codex-plugin/plugin.json` map directly to environment variables so Codex can configure the plugin without modifying the wrapper script.

The key required inputs are:

- `MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL`
- `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_ISSUER`
- `MCP_COMPLIANCE_THEATER_RESOURCE_MCP_COMMAND`
- `MCP_COMPLIANCE_THEATER_RESOURCE_MCP_ARGS`

Useful optional inputs include:

- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_ID`
- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_SECRET`
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

The wrapper adds two convenience tools on top of whatever the child MCP server exposes:

- `mcp_resource_auth_list_abilities`
  Returns a text summary of tool names, descriptions, schemas, and resource counts.
- `mcp_resource_auth_list_resources`
  Returns a directory-style listing of resources and resource templates.
- `mcp_resource_auth_manage_auth`
  Manages auth state with action-based operations:
  - `status`: inspects auth state and calls `/api/auth/session` with the bearer token.
  - `clear-cache`: deletes the local cached token file.
  - `login`: runs an interactive login flow and caches a fresh token.

`mcp_resource_auth_manage_auth` status output behaves as follows:

- If no configured or cached token exists, it returns `unauthenticated`.
- If a token exists, it calls `[MCP Server]/api/auth/session` using `Authorization: Bearer <token>`.
- If session reports unauthenticated (or HTTP 401/403), it reports cached token unauthenticated.
- If session reports authenticated, it prints helpful details including user name, email, id/hash when present, expiry, scope, and resource-access permissions.

These are implemented in the wrapper itself and are useful even when the remote MCP server exposes a large surface area.

## Runtime Utilities

`scripts/runtime-utils.mjs` provides the shared mechanics used by both the wrapper and the smoke scripts:

- token expiry calculation and skew-aware cache reuse
- secure token cache writes under `~/.codex/mcp-resource-auth/` by default
- retry and exponential backoff for HTTP requests
- warnings for insecure non-loopback HTTP URLs
- SSE connection setup using `Authorization: Bearer ...`
- simple JSON-RPC request/response helpers over SSE

The accompanying `scripts/runtime-utils.test.mjs` covers the retry policy, endpoint resolution, insecure URL warnings, and cache-expiry behavior.

## Smoke Scripts

This folder includes two small validation scripts:

- `scripts/smoke-list-abilities-sse.mjs`
  Acquires or reuses a token, connects to the SSE endpoint, initializes MCP, and lists tools.
- `scripts/smoke-list-resources-sse.mjs`
  Reuses a cached token, connects to the SSE endpoint, and prints resource and resource-template listings.

These scripts are useful for confirming that:

- the OAuth issuer is reachable
- token acquisition works
- the SSE endpoint accepts bearer authentication
- the MCP server is exposing tools and resources as expected

## Bundled Skill

`skills/mcp-resource-auth/SKILL.md` tells Codex how to use this plugin responsibly.

The skill emphasizes:

- using authenticated MCP resources and tools before guessing or searching elsewhere
- relying on RFC 8414 metadata discovery
- avoiding printing secrets
- using the helper actions for tool and resource discovery
- preferring narrow resource reads and read-only actions unless mutation is explicitly requested

## Operational Notes

- The wrapper writes interactive login prompts, device codes, and status messages to stderr so stdout remains clean JSON-RPC for Codex.
- The child MCP process inherits stderr, which makes auth and startup problems easier to diagnose.
- The plugin caches access tokens on disk unless caching is disabled.
- The wrapper warns when the OAuth issuer or SSE endpoint uses insecure HTTP outside loopback hosts.
- The child MCP command and args are not hardcoded here; this folder is meant to wrap a real MCP server command supplied through configuration.

## Current Metadata Gaps

The plugin manifest already identifies this package as a Codex plugin for authenticated MCP access, but a few manifest URLs are still placeholders:

- homepage
- website URL
- privacy policy URL
- terms of service URL

If this plugin is intended for broader distribution, those should be replaced with real documentation and policy endpoints.

## Minimal Example

```bash
export MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL="http://localhost:3000/api/ai/tools/sse"
export MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_ISSUER="https://login.obapps.net/realms/compliance-theater"
export MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_ID="codex"
export MCP_COMPLIANCE_THEATER_RESOURCE_MCP_COMMAND="node"
export MCP_COMPLIANCE_THEATER_RESOURCE_MCP_ARGS='["./path/to/real-mcp-server.mjs"]'

node ./scripts/oauth-mcp-wrapper.mjs
```

The wrapper will then acquire a bearer token if needed, start the real MCP server, and proxy Codex traffic through an authenticated connection.