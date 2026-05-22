---
name: mcp-resource-auth
description: Use an authenticated MCP server as a source of tools and resources. Trigger when the user asks to authenticate with an MCP server, list MCP abilities, list MCP tools, list MCP resources, call MCP tools, read MCP resources, or use context exposed by a configured MCP server.
---

# MCP Resource Auth

Use this skill when a task depends on tools or resources exposed by the plugin's MCP server.

## Workflow

1. Confirm the server configuration in `../../.mcp.json` has been customized for the target MCP server and OAuth issuer.
2. Let `../../src/scripts/oauth-mcp-wrapper.ts` discover login requirements from RFC 8414 metadata before the MCP server starts.
3. Check whether the required environment variables are present before invoking tools. Never print secret values.
4. Prefer MCP tools and resources over web search or local guesses when the requested context is available from the server.
5. Use the `mcp_resource_auth_list_abilities` helper action when the user asks what the server can do.
6. Use the `mcp_resource_auth_list_resources` helper action when the user asks for available resources or a directory-style listing.
7. Use `mcp_resource_auth_manage_auth` for authentication operations:
   - `action: "status"` to inspect current auth state and user/session details.
   - `action: "login"` to trigger interactive login and cache a fresh token.
   - `action: "clear-cache"` to remove the local cached token.
8. When device authorization returns a verification URL or user code, relay it to the user immediately and ask them to complete authentication before waiting for the login result.
9. Read the specific resource URI that best matches the user's request.
10. If resource templates are exposed, use the narrowest template that answers the request.
11. Summarize what was read or called and cite the MCP resource URI, template name, or tool name in the response.

## Authentication Pattern

This plugin expects authentication to be handled by the OAuth wrapper before the MCP server process starts. Keep tokens, client secrets, and API keys out of plugin files.

The wrapper uses RFC 8414 authorization server discovery:

- Prefer `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_METADATA_URL` when it is set.
- Otherwise derive `/.well-known/oauth-authorization-server` candidates from `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_ISSUER`.
- Inspect metadata such as `issuer`, `authorization_endpoint`, `token_endpoint`, `device_authorization_endpoint`, `grant_types_supported`, `scopes_supported`, and `token_endpoint_auth_methods_supported`.
- Choose the best compatible flow from the discovered metadata and available credentials.

Typical variables:

- `MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL`: Base URL for the upstream service or remote MCP endpoint.
- `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_ISSUER`: OAuth authorization server issuer URL.
- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_ID`: OAuth public client identifier.
- `MCP_COMPLIANCE_THEATER_RESOURCE_OAUTH_SCOPE`: Space-delimited scopes requested for resource access.
- `MCP_COMPLIANCE_THEATER_RESOURCE_MCP_COMMAND`: Command that starts the real MCP server.
- `MCP_COMPLIANCE_THEATER_RESOURCE_MCP_ARGS`: JSON array of arguments for the real MCP server command.
- `MCP_COMPLIANCE_THEATER_RESOURCE_CHILD_ACCESS_TOKEN_ENV`: Environment variable name used to pass the access token to the real MCP server. Defaults to `MCP_COMPLIANCE_THEATER_RESOURCE_ACCESS_TOKEN`.

The plugin manifest exposes the target server URL, authorization issuer, client id, client secret, OAuth scope, MCP command, and MCP args as plugin settings mapped to these environment variables. Defaults are:

- Issuer: `https://login.obapps.net/realms/compliance-theater`
- Client id: `codex`
- Scope: `openid`
- Target server URL: `http://localhost:3000/api/ai/tools/sse`

Optional advanced overrides:

- `MCP_COMPLIANCE_THEATER_RESOURCE_AUTH_METADATA_URL`: Explicit RFC 8414 metadata URL when the standard well-known URL cannot be derived.
- `MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_SECRET`: Optional OAuth client secret for confidential clients.
- `MCP_COMPLIANCE_THEATER_RESOURCE_USERNAME`: Optional username for the OAuth password grant.
- `MCP_COMPLIANCE_THEATER_RESOURCE_PASSWORD`: Optional password for the OAuth password grant.
- `MCP_COMPLIANCE_THEATER_RESOURCE_ACCESS_TOKEN`: Optional pre-issued bearer token. When set, discovery is skipped.
- `MCP_COMPLIANCE_THEATER_RESOURCE_REFRESH_TOKEN`: Optional refresh token. When set, the wrapper attempts refresh-token grant.
- `MCP_COMPLIANCE_THEATER_RESOURCE_TOKEN_CACHE_PATH`: Optional path for the token cache file.
- `MCP_COMPLIANCE_THEATER_RESOURCE_DISABLE_TOKEN_CACHE`: Set to `1` to disable token persistence.
- `MCP_COMPLIANCE_THEATER_RESOURCE_TOKEN_EXPIRY_SKEW_SECONDS`: Optional cache expiry skew. Defaults to `60`.
- `MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_TIMEOUT_MS`: Optional outbound HTTP timeout in milliseconds. Defaults to `15000`.
- `MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_RETRY_COUNT`: Optional retry count for retryable HTTP failures. Defaults to `2`.
- `MCP_COMPLIANCE_THEATER_RESOURCE_HTTP_RETRY_BASE_MS`: Optional exponential backoff base in milliseconds. Defaults to `500`.
- `MCP_COMPLIANCE_THEATER_RESOURCE_PROXY_REQUEST_TIMEOUT_MS`: Optional timeout for child MCP JSON-RPC calls. Defaults to `30000`.
- `MCP_COMPLIANCE_THEATER_RESOURCE_DEVICE_CODE_TIMEOUT_SECONDS`: Optional upper bound for device-code polling. Defaults to `900`.

Supported dynamic flows:

- Existing access token: inject it directly into the child MCP server.
- Cached access token: reuse a previously acquired token until it is close to expiry.
- Refresh token: use the discovered `token_endpoint`.
- Client credentials: use when `client_credentials` is advertised and client credentials are available.
- Password grant: use when `password` is advertised and username/password are configured through environment variables or secure settings.
- Dynamic client registration: use when `registration_endpoint` is advertised and no client id is configured.
- Device authorization: use when `device_authorization_endpoint` is advertised and a client id is available or was dynamically registered. User-code instructions are written to stderr so MCP stdout remains clean. When the wrapper prints a verification URL or user code, tell the user what to open or enter and ask them to authenticate before continuing to poll or concluding the login timed out.
