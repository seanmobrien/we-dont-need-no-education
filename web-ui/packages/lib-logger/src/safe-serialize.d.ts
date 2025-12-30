/**
 * @fileoverview Safe serialization utilities for logging and debugging
 *
 * This module provides utilities for safely converting arbitrary JavaScript values
 * into string representations without risking circular references, infinite loops,
 * or excessive memory consumption. Designed for use in logging, error reporting,
 * and telemetry contexts where robust serialization is critical.
 *
 * Key features:
 * - Handles circular references and complex object graphs safely
 * - Configurable depth and length limits to prevent performance issues
 * - Specialized serializers for common patterns (server descriptors, function arguments)
 * - Never throws errors - always returns a safe string representation
 *
 * @example
 * ```typescript
 * import { safeSerialize } from '@compliance-theater/logger/safe-serialize';
 *
 * // Basic serialization with defaults
 * const str = safeSerialize({ user: 'alice', id: 123 });
 * // Output: "{user,id}"
 *
 * // Custom length limit
 * const limited = safeSerialize(longString, 50);
 *
 * // Serialize function arguments for logging
 * function myFunction(a: number, b: string) {
 *   console.log('Called with:', safeSerialize.argsSummary([a, b]));
 * }
 * ```
 *
 * @module @compliance-theater/logger/safe-serialize
 */
declare module '@compliance-theater/logger/safe-serialize' {
  /**
   * Configuration options for safe serialization behavior.
   *
   * These options control how deeply objects are traversed and how much
   * output is generated, allowing fine-tuned control over serialization
   * performance and output verbosity.
   *
   * @example
   * ```typescript
   * const options: SafeSerializeOptions = {
   *   maxLen: 100,      // Truncate strings at 100 characters
   *   maxDepth: 5,      // Show first 5 object keys only
   *   maxIterations: 3  // Process first 3 array elements
   * };
   *
   * const result = safeSerialize(complexObject, options);
   * ```
   */
  type SafeSerializeOptions = {
    /**
     * Maximum length of the serialized output string.
     *
     * When the serialized representation exceeds this length, it will be
     * truncated. Applies to primitive string values and the final output.
     *
     * @default 200
     */
    maxLen?: number;

    /**
     * Maximum depth for object key enumeration.
     *
     * For objects, only the first `maxDepth` keys will be included in the
     * serialized output. This prevents excessive output from objects with
     * many properties.
     *
     * @default 10
     */
    maxPropertyDepth?: number;

    /**
     * Maximum depth for nested object traversal.
     *
     * For nested objects, the first `maxObjectDepth` levels will be traversed
     */
    maxObjectDepth?: number;
    /**
     * Maximum number of array elements or iterations to process.
     *
     * When serializing arrays or performing iterative operations, only the
     * first `maxIterations` items will be processed. This prevents performance
     * issues with large arrays.
     *
     * @default 5
     */
    maxIterations?: number;

    /**
     * @internal
     * Current recursion depth (for internal use).
     */
    currentDepth?: number;
  };

  /**
   * Describes key properties of an MCP (Model Context Protocol) server instance.
   *
   * This type represents a safe, serializable subset of server configuration
   * information extracted from potentially complex server objects. Used primarily
   * for logging and telemetry to track server connections without exposing
   * sensitive internal state.
   *
   * @example
   * ```typescript
   * const descriptor: SafeServerDescriptor = {
   *   basePath: '/api/mcp',
   *   transportType: 'stdio',
   *   transportUrl: 'http://localhost:3000'
   * };
   * ```
   */
  type SafeServerDescriptor = {
    /**
     * The base path or mount point for the server, if applicable.
     *
     * For HTTP-based servers, this typically represents the URL path prefix.
     * May be `null` if the server has no configured base path or if extraction failed.
     */
    basePath: string | null;

    /**
     * The transport mechanism used by the server.
     *
     * Common values include:
     * - `'stdio'` - Standard input/output communication
     * - `'http'` - HTTP-based transport
     * - `'websocket'` - WebSocket transport
     * - `null` - Transport type unavailable or unknown
     */
    transportType: string | null;

    /**
     * The full URL or endpoint address for the server transport.
     *
     * For network-based transports, this contains the complete connection URL.
     * May be `null` for non-network transports or if unavailable.
     */
    transportUrl: string | null;
  };

  /**
   * Function signature for the safe serialization utility.
   *
   * This type describes a callable function with additional specialized methods
   * attached as properties, following a namespace-like pattern for related
   * serialization utilities.
   *
   * @example
   * ```typescript
   * // Direct invocation
   * const str = safeSerialize(value);
   *
   * // Using specialized methods
   * const descriptor = safeSerialize.serverDescriptor(mcpServer);
   * const argsSummary = safeSerialize.argsSummary([arg1, arg2, arg3]);
   * ```
   */
  type SafeSerialize = {
    /**
     * Primary serialization function signature.
     *
     * Converts an arbitrary value to a safe string representation. The second
     * parameter accepts either a full options object or a single number representing
     * `maxLen` for convenience.
     *
     * @param v - The value to serialize (can be any type)
     * @param options - Serialization options or a single maxLen value
     * @returns A safe string representation that never throws errors
     */
    (v: unknown, options?: SafeSerializeOptions | number): string;

    /**
     * Extracts and serializes key properties from an MCP server instance.
     *
     * This method safely traverses server objects to extract configuration
     * information commonly needed for logging and telemetry, while avoiding
     * exposure of sensitive internal state or circular references.
     *
     * @param srv - The server instance to describe (typically an MCP server object)
     * @param options - Optional serialization options for nested values
     * @returns A descriptor object containing extracted server properties
     *
     * @example
     * ```typescript
     * const server = await createMCPServer({ basePath: '/api' });
     * const descriptor = safeSerialize.serverDescriptor(server);
     * console.log(`Server at ${descriptor.basePath} using ${descriptor.transportType}`);
     * ```
     */
    serverDescriptor: (
      srv: unknown,
      options?: SafeSerializeOptions,
    ) => SafeServerDescriptor;

    /**
     * Creates a compact summary string of function arguments for logging.
     *
     * This method serializes an array of function arguments into a single
     * comma-separated string, applying length and iteration limits to prevent
     * excessive output. Particularly useful for logging function calls in
     * trace/debug contexts.
     *
     * @param args - Array of function arguments to summarize
     * @param options - Optional serialization options
     * @returns Comma-separated string representation of arguments
     *
     * @example
     * ```typescript
     * function processData(userId: string, data: object, flags: string[]) {
     *   const summary = safeSerialize.argsSummary([userId, data, flags]);
     *   logger.debug(`processData called with: ${summary}`);
     *   // Output: "processData called with: user123, {id,name,email}, [Array length=3]"
     * }
     * ```
     *
     * @example
     * ```typescript
     * // With custom iteration limit
     * const args = [1, 2, 3, 4, 5, 6, 7, 8];
     * const summary = safeSerialize.argsSummary(args, { maxIterations: 3 });
     * // Output: "1, 2, 3" (only first 3 items)
     * ```
     */
    argsSummary: (args: unknown[], options?: SafeSerializeOptions) => string;
  };

  /**
   * Main safe serialization utility with specialized methods.
   *
   * This function safely converts any JavaScript value to a string representation
   * without risking errors from circular references, deeply nested structures, or
   * exotic value types. Designed for robust logging and debugging scenarios where
   * serialization must never fail.
   *
   * ## Serialization Behavior by Type
   *
   * - **Primitives** (`null`, `undefined`, `string`, `number`, `boolean`): Converted using `String()`
   * - **Arrays**: Serialized as `[Array length=N]` to avoid deep traversal
   * - **Errors**: Formatted as `ErrorName: message`
   * - **Objects**: Serialized as `{key1,key2,...}` showing only key names (up to `maxDepth`)
   * - **Other types**: Converted to string and truncated to `maxLen`
   * - **Unserializable values**: Return `'[unserializable]'`
   *
   * ## Options
   *
   * The second parameter accepts either:
   * 1. A full {@link SafeSerializeOptions} object for fine-grained control
   * 2. A single number representing `maxLen` (for convenience)
   *
   * ## Error Handling
   *
   * This function **never throws errors**. If serialization fails for any reason,
   * it returns a safe fallback string instead of propagating exceptions.
   *
   * @param v - The value to serialize
   * @param options - Serialization options or maxLen shorthand
   * @returns Safe string representation
   *
   * @example
   * ```typescript
   * // Serialize with default options
   * safeSerialize({ user: 'alice', role: 'admin' });
   * // Returns: "{user,role}"
   *
   * // Serialize with custom length limit (shorthand)
   * safeSerialize(veryLongString, 50);
   *
   * // Serialize with full options
   * safeSerialize(complexObject, {
   *   maxLen: 500,
   *   maxDepth: 20,
   *   maxIterations: 10
   * });
   *
   * // Handle different types
   * safeSerialize(null);                    // "null"
   * safeSerialize([1, 2, 3]);              // "[Array length=3]"
   * safeSerialize(new Error('Failed'));    // "Error: Failed"
   * safeSerialize(undefined);              // "undefined"
   * ```
   *
   * @example
   * ```typescript
   * // Use in OpenTelemetry span attributes
   * import { createInstrumentedSpan } from '@/lib/nextjs-util/server/utils';
   *
   * const instrumented = await createInstrumentedSpan({
   *   spanName: 'process-request',
   *   attributes: {
   *     'request.body': safeSerialize(req.body, 200),
   *     'request.headers': safeSerialize(req.headers)
   *   }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Use in error logging
   * try {
   *   await riskyOperation(complexData);
   * } catch (error) {
   *   logger.error('Operation failed', {
   *     error: safeSerialize(error),
   *     input: safeSerialize(complexData, { maxDepth: 5 })
   *   });
   * }
   * ```
   *
   * @public
   */
  export const safeSerialize: SafeSerialize;
}
