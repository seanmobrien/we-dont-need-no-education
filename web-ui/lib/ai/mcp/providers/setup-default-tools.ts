/**
 * MCP Default Tool Setup Utilities
 * ------------------------------------------------------------------
 * This module centralizes construction of a standard set of Model Context
 * Protocol (MCP) tool providers used by the AI orchestration layer. It
 * produces a composable tool provider collection based on runtime options
 * such as request context, write permissions, and optional memory tooling.
 *
 * EXPORTS
 *  - {@link getMcpClientHeaders}: Extracts / synthesizes HTTP headers (cookies,
 *    correlation IDs) required by remote MCP tool endpoints.
 *  - {@link setupDefaultTools}: High-level factory that assembles an array of
 *    provider configurations and delegates to `toolProviderSetFactory`.
 *
 * DESIGN PRINCIPLES
 *  1. Isolation: HTTP header extraction is separate from provider assembly.
 *  2. Extensibility: Add new provider sources by pushing onto the `options`
 *     array before invocation of `toolProviderSetFactory`.
 *  3. Safety: Only forwards the session cookie when present; omits entirely
 *     if absent to avoid sending empty tokens.
 *  4. Determinism: Absent `req` or when `memoryEnabled` is false, those
 *     providers are simply not included—no partial objects.
 *
 * ENVIRONMENT VARIABLES (via env())
 *  - NEXT_PUBLIC_HOSTNAME: Base host used to build first-party tool SSE URL.
 *  - MEM0_API_HOST, MEM0_USERNAME: Configure optional memory provider path.
 *
 * NOTE: The underlying `toolProviderSetFactory` is expected to merge/instantiate
 * the specified provider configurations and return an aggregated interface the
 * caller can hand to higher-level AI tooling.
 */
import { toolProviderSetFactory } from './toolProviderFactory';
import { env } from '@/lib/site-util/env';
import { ToolProviderFactoryOptions, ToolProviderSet } from '../types';
import { NextRequest } from 'next/server';
import { fromRequest } from '@/lib/auth/impersonation';

/**
 * Builds a minimal header map for MCP client connections.
 *
 * Responsibilities:
 *  - Conditionally attaches a chat history correlation header.
 *  - Forwards a session cookie (Auth.js) when present so server-originating
 *    tool invocations can perform authenticated actions.
 *
 * Cookie Forwarding Logic:
 *  If `authjs.session-token` exists in the request cookies, sets a `Cookie`
 *  header with only that token (scope-limited forwarding instead of sending
 *  the entire cookie jar).
 *
 * @param params.req Incoming Next.js request object (server context).
 * @param params.chatHistoryId Optional chat history identifier for correlation.
 * @returns A record of header key/value pairs safe for upstream MCP requests.
 */
export const getMcpClientHeaders = ({
  req,
  chatHistoryId,
}: {
  req: NextRequest;
  chatHistoryId?: string;
}): Record<string, string> => {
  const ret: { [key: string]: string } = {
    ...(chatHistoryId ? { 'x-chat-history-id': chatHistoryId } : {}),
  };
  const sessionCookie = req.cookies?.get('authjs.session-token')?.value ?? '';
  if (sessionCookie.length > 0) {
    ret.Cookie = `authjs.session-token=${sessionCookie}`;
  }
  return ret;
};

/**
 * Constructs and returns the default set of MCP tool providers based on
 * runtime configuration flags.
 *
 * Provider Sources:
 *  1. First-party tools (if `req` is supplied) – Configured with SSE endpoint
 *     at `/api/ai/tools/sse` relative to the public hostname. Write capability
 *     is governed by `writeEnabled`.
 *  2. Memory provider (if `memoryEnabled` true) – An auxiliary tool namespace
 *     for persistent or contextual memory operations (OpenMemory / MEM0).
 *
 * Header Strategy:
 *  Uses {@link getMcpClientHeaders} for request-scoped headers, and attaches
 *  caching directives for the memory provider to avoid unintended intermediaries.
 *
 * @param params.writeEnabled Optional flag enabling write operations for the
 *        first-party tool provider. Undefined treated as falsey (read-only).
 * @param params.req Optional Next.js request; absence skips first-party tools.
 * @param params.chatHistoryId Optional identifier passed to headers for context.
 * @param params.memoryEnabled Defaults to true; toggles memory provider inclusion.
 * @returns A promise resolving to the aggregated provider set returned by
 *          `toolProviderSetFactory`.
 */
export const setupDefaultTools = async ({
  writeEnabled,
  req,
  chatHistoryId,
  memoryEnabled = true,
}: {
  writeEnabled?: boolean;
  req?: NextRequest;
  chatHistoryId?: string;
  memoryEnabled?: boolean;
}): Promise<ToolProviderSet> => {
  const options: Array<ToolProviderFactoryOptions> = [];
  const defaultHeaders = {
    ...(chatHistoryId ? { 'x-chat-history-id': chatHistoryId } : {}),
  };
  if (req) {
    const sessionToken = req.cookies?.get('authjs.session-token')?.value ?? '';
    options.push({
      allowWrite: writeEnabled,
      url: new URL('/api/ai/tools/sse', env('NEXT_PUBLIC_HOSTNAME')).toString(),
      headers: async () => ({
        ...defaultHeaders,
        ...(sessionToken
          ? { Cookie: `authjs.session-token=${sessionToken}` }
          : {}),
      }),
    });
  }
  if (memoryEnabled && !env('MEM0_DISABLED')) {
    const impersonation = await fromRequest({ req });
    options.push({
      allowWrite: true,
      headers: async () => ({
        ...defaultHeaders,
        'cache-control': 'no-cache, no-transform',
        'content-encoding': 'none',
        Authorization: impersonation
          ? `Bearer ${impersonation ? await impersonation.getImpersonatedToken() : ''}`
          : `APIKey ${env('MEM0_API_KEY')}`,
      }),
      url: `${env('MEM0_API_HOST')}/mcp/${env('MEM0_PROJECT_ID')}/sse`,
    });
  }
  return await toolProviderSetFactory(options);
};
