/**
 * @fileoverview Tool-related MCP utilities and proxies
 * @module tools
 */

import type { Tool } from 'ai';

/**
 * Create a proxy wrapper for a Tool object that defers binding to the live
 * implementation until a proxied method is invoked.
 *
 * Purpose
 * - When tools are cached (for example, serialized into Redis) they lose the
 *   runtime function context required for invocation. The proxy returned by
 *   `toolProxyFactory` allows consumers to interact with a cached tool object
 *   while transparently loading and binding the live implementation from an
 *   MCP client on first use.
 *
 * Behavior and guarantees
 * - The returned object implements the same `Tool<INPUT, OUTPUT>` shape as the
 *   provided `tool` argument. Proxied method calls are lazy—on first use the
 *   proxy will attempt to load the live tool (via the provided `mcpClient`),
 *   bind the live methods into an internal vtable and forward the call.
 * - If the proxy fails to load the live tool, method calls will resolve to
 *   `undefined` (matching the tolerant behavior of the original implementation)
 *   and errors are logged via the project's LoggedError utilities (not exposed
 *   here).
 * - The proxy adds minimal runtime overhead on method access; only the first
 *   invocation triggers the async load. Subsequent calls use the bound vtable.
 *
 * @template INPUT - the input parameter type accepted by the tool
 * @template OUTPUT - the output type produced by the tool
 * @param params.mcpClient Either:
 *   - An async loader function (name) => Promise<Tool<INPUT, OUTPUT> | undefined>
 *     that returns a live tool instance by name, or
 *   - An object with a `tools(): Promise<Record<string, Tool<INPUT, OUTPUT>>>`
 *     method that resolves to a tool map. This supports passing a full MCP
 *     client-like object.
 * @param params.name The canonical tool name used to identify the live tool.
 * @param params.tool The cached tool descriptor (may contain metadata and
 *   serializable schema fields). This object serves as the initial shape for
 *   the proxied tool and is returned synchronously by the factory.
 * @returns A `Tool<INPUT, OUTPUT>` instance whose callable methods will lazily
 *   forward to the live tool implementation when available.
 *
 * @example
 * ```ts
 * const proxied = toolProxyFactory({
 *   mcpClient: async (name) => (await mcpClient.tools())[name],
 *   name: 'search',
 *   tool: cachedTool,
 * });
 * // First call loads the live tool and forwards the execute call
 * await proxied.execute({ query: 'hello' });
 * ```
 *
 * Edge cases
 * - If the `mcpClient` loader rejects or returns undefined, proxied calls will
 *   return `undefined`. Callers should treat tool calls as possibly absent and
 *   handle undefined results accordingly.
 * - The factory does not deep-clone the `tool` argument; it is safe to pass a
 *   read-only descriptor or a fresh object per cached entry.
 */
export declare function toolProxyFactory<
  INPUT = unknown,
  OUTPUT = unknown,
>(params: {
  mcpClient:
    | ((name: string) => Promise<Tool<INPUT, OUTPUT> | undefined>)
    | { tools: () => Promise<Record<string, Tool<INPUT, OUTPUT>>> };
  name: string;
  tool: Tool<INPUT, OUTPUT>;
}): Tool<INPUT, OUTPUT>;

/**
 * Attach internal proxy vtable to a live tool so that any proxied instances may
 * bind directly to the live implementation without having to load it again.
 *
 * Purpose
 * - This function is intended for internal optimization. When multiple
 *   proxied tool instances exist (for example, one per cached entry), attaching
 *   the live tool to a proxy's internal vtable allows all proxied instances to
 *   use the same bound methods, avoiding repeated loads.
 *
 * Behavior and guarantees
 * - If the supplied `tool` object exposes the special attach hook, this
 *   function will call it and return `true` to indicate the vtable was
 *   attached. If attachment is not supported or fails, `false` is returned.
 * - This function is safe to call multiple times and is idempotent when the
 *   tool supports vtable attachment.
 *
 * @template INPUT - input type for the tool
 * @template OUTPUT - output type for the tool
 * @param tool A live Tool implementation to which proxy vtables can attach.
 * @returns `true` when the vtable was attached, `false` otherwise.
 *
 * @example
 * ```ts
 * const liveTool = await mcpClient.tools()['search'];
 * attachProxyToTool(liveTool); // binds proxied instances to liveTool methods
 * ```
 */
export declare function attachProxyToTool<INPUT = unknown, OUTPUT = unknown>(
  tool: Tool<INPUT, OUTPUT>,
): boolean;
