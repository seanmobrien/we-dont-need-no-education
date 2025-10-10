/**
 * Type declarations for MCP types module
 */

import type { ToolSet } from 'ai';

declare module '@/lib/ai/mcp/types' {
  /**
   * @fileoverview TypeScript type definitions for Model Context Protocol (MCP) integration
   *
   * This module defines the core TypeScript interfaces and types used throughout the MCP
   * (Model Context Protocol) system for AI tool integration. It provides type-safe abstractions
   * for MCP clients, tool providers, and tool management within the application.
   *
   * The MCP system enables AI models to interact with external tools and services through
   * a standardized protocol, allowing for dynamic tool discovery, execution, and management.
   *
   * Key components:
   * - MCPClient: Type-safe wrapper for MCP client instances
   * - ToolProviderFactoryOptions: Configuration for tool provider factories
   * - ConnectableToolProvider: Interface for providers that can connect to MCP servers
   * - ToolProviderSet: Collection of tool providers with aggregated tool access
   * - UserToolProviderCache: User-scoped caching interface for tool providers
   *
   * @example
   * ```typescript
   * import type {
   *   MCPClient,
   *   ConnectableToolProvider,
   *   ToolProviderFactoryOptions,
   *   UserToolProviderCache
   * } from '@/lib/ai/mcp/types';
   *
   * // Configure a tool provider factory
   * const options: ToolProviderFactoryOptions = {
   *   url: 'https://api.example.com/mcp',
   *   headers: async () => ({ 'Authorization': 'Bearer token' }),
   *   allowWrite: true,
   *   req: request,
   *   impersonation: impersonationService
   * };
   * ```
   */

  /**
   * Type alias for an MCP (Model Context Protocol) client instance.
   *
   * This type represents the unwrapped promise result of creating an MCP client using
   * the experimental_createMCPClient function from the 'ai' library. It provides
   * type-safe access to MCP client functionality for tool discovery and execution.
   *
   * The MCPClient encapsulates the low-level protocol communication with MCP servers,
   * handling connection management, tool enumeration, and secure tool execution.
   * It abstracts away the complexities of the MCP wire protocol while providing
   * a clean, promise-based API for AI model interactions.
   *
   * @typedef {UnwrapPromise<ReturnType<typeof createMCPClient>>} MCPClient
   *
   * @example
   * ```typescript
   * // The MCPClient type is automatically inferred from the createMCPClient call
   * const client: MCPClient = await createMCPClient({
   *   transport: new SSETransport({ url: 'https://api.example.com/mcp' })
   * });
   *
   * // Use the client to interact with MCP servers
   * const tools = await client.listTools();
   * const result = await client.callTool('calculator', { expression: '2+2' });
   * ```
   *
   * @see {@link ConnectableToolProvider} for higher-level tool provider abstraction
   * @see {@link ToolSet} for the structure of available tools
   * @since 1.0.0
   */
  export type MCPClient = unknown;

  /**
   * Configuration options for creating and configuring tool provider factory instances.
   *
   * This interface defines the parameters needed to set up a tool provider that can
   * connect to MCP servers and manage tool discovery and execution. It supports
   * authentication, write permissions, tracing, and impersonation for secure tool access.
   *
   * The configuration controls how tool providers authenticate with MCP servers,
   * what permissions they have, and how they handle request context propagation.
   * Proper configuration is essential for security and functionality.
   *
   * @typedef {Object} ToolProviderFactoryOptions
   *
   * @property {string} url - The base URL of the MCP server to connect to. This should be
   *   a fully qualified URL including protocol (http/https) and port if non-standard.
   *   The URL must be accessible from the application server and support MCP protocol.
   * @property {() => Promise<Record<string, string>>} [headers] - Optional asynchronous function
   *   that returns HTTP headers to include with all requests to the MCP server. Commonly
   *   used for authentication tokens, API keys, or session identifiers. The function allows
   *   for dynamic header generation (e.g., token refresh).
   * @property {boolean} [allowWrite] - Optional flag controlling whether write-enabled tools
   *   should be included in the tool set. When false, only read-only tools are exposed.
   *   Defaults to false for security. Write operations typically require elevated permissions.
   * @property {Request} [req] - Optional Request object representing the incoming HTTP request.
   *   This can be used to propagate request-specific context such as headers, user info,
   *   or tracing data. Useful for maintaining request chains and audit trails.
   * @property {ImpersonationService} [impersonation] - Optional impersonation service instance
   *   for making authenticated requests on behalf of users. Enables secure delegation of
   *   tool execution permissions while maintaining proper access controls and audit logging.
   *
   * @example
   * ```typescript
   * // Basic configuration for a read-only tool provider
   * const basicOptions: ToolProviderFactoryOptions = {
   *   url: 'https://api.example.com/mcp'
   * };
   *
   * // Advanced configuration with authentication and write access
   * const advancedOptions: ToolProviderFactoryOptions = {
   *   url: 'https://secure-api.example.com/mcp',
   *   headers: async () => ({
   *     'Authorization': `Bearer ${await getAuthToken()}`,
   *     'X-API-Version': 'v2',
   *     'X-Request-ID': generateRequestId()
   *   }),
   *   allowWrite: true,
   *   req: incomingRequest,
   *   impersonation: impersonationService
   * };
   * ```
   *
   * @see {@link ConnectableToolProvider} for the resulting provider interface
   * @see {@link ImpersonationService} for user impersonation capabilities
   * @since 1.0.0
   */
  export type ToolProviderFactoryOptions = {
    url: string;
    headers?: () => Promise<Record<string, string>>;
    allowWrite?: boolean;
    req?: Request;
    impersonation?: unknown;
  };

  /**
   * Interface representing a tool provider that can connect to and manage MCP tools.
   *
   * This interface defines the contract for providers that establish connections to MCP
   * servers and provide access to their available tools. It supports connection management,
   * tool discovery, and resource cleanup operations.
   *
   * @typedef {Object} ConnectableToolProvider
   *
   * @property {() => MCPClient} get_mcpClient - Returns the underlying MCP client instance
   *   used for communication with the MCP server. The client handles the low-level protocol
   *   communication and tool execution.
   * @property {() => boolean} get_isConnected - Returns a boolean indicating whether the
   *   provider is currently connected to the MCP server. Connection status affects tool
   *   availability and execution capabilities.
   * @property {() => ToolSet} tools - Returns the current set of available tools from
   *   the connected MCP server. The tool set is dynamically updated based on server
   *   capabilities and connection permissions.
   * @property {() => Promise<void>} dispose - Asynchronously cleans up resources and
   *   disconnects from the MCP server. This method should be called when the provider
   *   is no longer needed to prevent resource leaks.
   * @property {(options: { allowWrite?: boolean }) => Promise<ConnectableToolProvider>} connect -
   *   Establishes a connection to the MCP server with optional write permissions.
   *   Returns a promise that resolves to the connected provider instance.
   *
   * @example
   * ```typescript
   * // Create and connect a tool provider
   * const provider: ConnectableToolProvider = await factory.create(options);
   *
   * // Check connection status
   * if (!provider.get_isConnected()) {
   *   // Establish connection with write permissions
   *   const connectedProvider = await provider.connect({ allowWrite: true });
   *
   *   // Access available tools
   *   const tools = connectedProvider.tools;
   *   console.log('Available tools:', Object.keys(tools));
   *
   *   // Use tools for AI interactions...
   *
   *   // Clean up when done
   *   await connectedProvider.dispose();
   * }
   * ```
   */
  export type ConnectableToolProvider = {
    get_mcpClient: () => MCPClient;
    get_isConnected: () => boolean;
    readonly tools: ToolSet;
    dispose: () => Promise<void>;
    connect: (opts: {
      allowWrite?: boolean;
    }) => Promise<ConnectableToolProvider>;
  };

  /**
   * Interface representing a collection of tool providers with aggregated tool access.
   *
   * This interface defines a set of tool providers that work together to provide a unified
   * view of available tools from multiple MCP servers. It enables load balancing, failover,
   * and centralized tool management across distributed tool providers.
   *
   * @typedef {Object} ToolProviderSet
   *
   * @property {boolean} isHealthy - Indicates whether all requested tool providers were
   *   successfully connected and are operational.
   * @property {Array<ConnectableToolProvider>} providers - Array of individual tool provider
   *   instances that supply tools. Each provider may connect to different MCP servers or
   *   provide different tool sets based on their configuration.
   * @property {() => ToolSet} tools - Returns a unified ToolSet containing all available
   *   tools from all connected providers. Tool names are deduplicated, with provider-specific
   *   tools accessible through the aggregated interface.
   * @property {() => Promise<void>} dispose - Asynchronously disposes of all providers in
   *   the set, cleaning up resources and disconnecting from all MCP servers. This ensures
   *   proper cleanup of the entire provider collection.
   *
   * @example
   * ```typescript
   * // Create a set of tool providers
   * const providerSet: ToolProviderSet = await factory.createSet([
   *   { url: 'https://api1.example.com/mcp', allowWrite: false },
   *   { url: 'https://api2.example.com/mcp', allowWrite: true }
   * ]);
   *
   * // Get all available tools from all providers
   * const allTools = providerSet.tools;
   * console.log('Total tools available:', Object.keys(allTools).length);
   *
   * // Access provider information
   * providerSet.providers.forEach((provider, index) => {
   *   console.log(`Provider ${index} connected:`, provider.get_isConnected());
   * });
   *
   * // Clean up all providers
   * await providerSet.dispose();
   * ```
   */
  export type ToolProviderSet = {
    readonly isHealthy: boolean;
    readonly tools: ToolSet;
    providers: Array<ConnectableToolProvider>;
    dispose: () => Promise<void>;
  };

  /**
   * Represents a cached tool provider entry with metadata for cache management.
   *
   * @property {number} lastAccessed - Timestamp (in milliseconds since epoch) when this
   *   cached entry was last accessed. Used for implementing time-based cache eviction
   *   policies like LRU (Least Recently Used) or TTL (Time To Live).
   * @property {string} userId - The unique identifier of the user who owns this cached
   *   tool provider. Used for user-scoped cache management and access control.
   * @property {string} sessionId - The unique identifier of the user session associated
   *   with this cached tool provider. Enables session-based cache invalidation and
   *   isolation between concurrent user sessions.
   *
   * @example
   * ```typescript
   * const cachedEntry: CachedToolProvider = {
   *   toolProviders: awai
   * This type encapsulates a tool provider set along with caching metadata used
   * for eviction policies, access tracking, and user/session association. The
   * cached entry tracks when it was last accessed to support time-based eviction
   * and usage analytics.
   *
   * @typedef {Object} CachedToolProvider
   *
   * @property {ToolProviderSet} toolProviders - The cached tool provider set containing
   *   the actual tool providers and their aggregated tools. This is the core cached
   *   resource that provit factory.createSet(options),
   *   lastAccessed: Date.now(),
   *   userId: 'user-123',
   *   sessionId: 'session-456'
   * };
   *
   * // Check if entry is stale (older than 30 minutes)
   * const thirtyMinutes = 30 * 60 * 1000;
   * const isStale = Date.now() - cachedEntry.lastAccessed > thirtyMinutes;
   *
   * if (isStale) {
   *   await cachedEntry.toolProviders.dispose();
   *   // Remove from cache
   * }
   * ```
   *
   * @see {@link ToolProviderSet} for the structure of cached tool providers
   * @see {@link UserToolProviderCache} for cache management interface
   * @since 1.0.0
   */
  export type CachedToolProvider = {
    toolProviders: ToolProviderSet;
    lastAccessed: number;
    userId: string;
    sessionId: string;
  };

  /**
   * Configuration options for the user tool provider cache system.
   *
   * This interface defines the tuning parameters for the cache that manages tool
   * providers on a per-user basis. The configuration controls memory usage, cache
   * lifetime, and cleanup behavior to balance performance with resource constraints.
   *
   * Proper cache configuration is crucial for maintaining good performance while
   * preventing memory leaks and ensuring responsive tool access across user sessions.
   *
   * @typedef {Object} UserToolProviderCacheConfig
   *
   * @property {number} maxEntriesPerUser - Maximum number of cached tool providers
   *   allowed per user. When this limit is exceeded, older entries are evicted based
   *   on access time. Higher values improve performance but increase memory usage.
   *   Typical values range from 5-20 depending on user activity patterns.
   * @property {number} maxTotalEntries - Maximum total number of cached entries across
   *   all users. This global limit prevents the cache from consuming excessive memory
   *   during high load periods. When exceeded, least recently used entries are evicted
   *   regardless of user association.
   * @property {number} ttl - Time to live in milliseconds for cache entries. Entries
   *   older than this duration are considered stale and may be evicted during cleanup.
   *   This provides a baseline guarantee for cache freshness. Common values are in
   *   the range of 30 minutes to 2 hours.
   * @property {number} cleanupInterval - Interval in milliseconds between automatic
   *   cache cleanup operations. During cleanup, expired entries are removed and
   *   memory is reclaimed. Shorter intervals provide more aggressive cleanup but
   *   increase CPU overhead. Typical values are 5-15 minutes.
   *
   * @example
   * ```typescript
   * // Production configuration optimized for memory efficiency
   * const prodConfig: UserToolProviderCacheConfig = {
   *   maxEntriesPerUser: 10,
   *   maxTotalEntries: 1000,
   *   ttl: 60 * 60 * 1000, // 1 hour
   *   cleanupInterval: 10 * 60 * 1000 // 10 minutes
   * };
   *
   * // Development configuration for debugging
   * const devConfig: UserToolProviderCacheConfig = {
   *   maxEntriesPerUser: 50,
   *   maxTotalEntries: 5000,
   *   ttl: 24 * 60 * 60 * 1000, // 24 hours
   *   cleanupInterval: 60 * 1000 // 1 minute
   * };
   * ```
   *
   * @see {@link UserToolProviderCache} for the cache interface that uses this configuration
   * @since 1.0.0
   */
  export type UserToolProviderCacheConfig = {
    /** Maximum number of cached tool providers per user */
    maxEntriesPerUser: number;
    /** Maximum total entries across all users */
    maxTotalEntries: number;
    /** Time to live in milliseconds */
    ttl: number;
    /** Cleanup interval in milliseconds */
    cleanupInterval: number;
  };

  /**
   * Interface for user-scoped tool provider cache operations.
   *
   * This interface defines the contract for a cache system that manages tool providers
   * on a per-user and per-session basis. It provides efficient access to tool providers
   * while implementing automatic cleanup, memory management, and invalidation strategies.
   *
   * The cache is designed to improve performance by reusing tool provider connections
   * across requests while ensuring proper resource cleanup and access control. It supports
   * both user-level and session-level invalidation for security and resource management.
   *
   * @typedef {Object} UserToolProviderCache
   *
   * @property {(userId: string, sessionId: string, config: { writeEnabled: boolean; memoryDisabled: boolean; headers?: Record<string, string>; }, factory: () => Promise<ToolProviderSet>) => Promise<ToolProviderSet>} getOrCreate -
   *   Retrieves an existing cached tool provider set or creates a new one for the specified
   *   user and session. The method implements cache lookup with fallback to factory creation.
   *   Updates access timestamps for cache management and applies configured limits.
   *   @param {string} userId - Unique identifier for the user requesting tool access
   *   @param {string} sessionId - Unique identifier for the current user session
   *   @param {Object} config - Configuration object controlling tool provider behavior
   *   @param {boolean} config.writeEnabled - Whether write-enabled tools should be included
   *   @param {boolean} config.memoryDisabled - Whether to disable caching for this request
   *   @param {Record<string, string>} [config.headers] - Optional headers for tool provider creation
   *   @param {() => Promise<ToolProviderSet>} factory - Async factory function to create tool providers when not cached
   *   @returns {Promise<ToolProviderSet>} The cached or newly created tool provider set
   *
   * @property {(userId: string) => void} invalidateUser - Removes all cached tool providers
   *   for a specific user across all their sessions. This method is used when user permissions
   *   change or when forcing a complete refresh of user's tool access. Properly disposes
   *   of all associated resources.
   *   @param {string} userId - The user ID whose cache entries should be invalidated
   *
   * @property {(userId: string, sessionId: string) => void} invalidateSession - Removes all
   *   cached tool providers for a specific user session. This method is used when sessions
   *   end or when session-specific permissions change. More granular than user-level invalidation.
   *   @param {string} userId - The user ID of the session to invalidate
   *   @param {string} sessionId - The session ID to invalidate
   *
   * @property {() => void} clear - Removes all cached tool providers across all users and
   *   sessions. This method performs a complete cache flush and properly disposes of all
   *   cached resources. Used during application shutdown or for emergency cleanup.
   *
   * @property {() => { totalEntries: number; userCounts: Record<string, number>; config: UserToolProviderCacheConfig; }} getStats -
   *   Returns comprehensive statistics about the current cache state. Provides insights
   *   into memory usage, user distribution, and configuration for monitoring and debugging.
   *   @returns {Object} Cache statistics including total entries, per-user counts, and configuration
   *
   * @property {() => void} shutdown - Performs graceful shutdown of the cache system,
   *   cleaning up all resources and stopping background cleanup processes. This method
   *   should be called during application shutdown to ensure proper resource cleanup.
   *
   * @example
   * ```typescript
   * // Get or create tool providers for a user session
   * const toolProviders = await cache.getOrCreate(
   *   'user-123',
   *   'session-456',
   *   {
   *     writeEnabled: true,
   *     memoryDisabled: false,
   *     headers: { 'Authorization': 'Bearer token' }
   *   },
   *   async () => await factory.createSet(options)
   * );
   *
   * // Use the tool providers
   * const result = await toolProviders.tools.calculator.call({ expression: '2+2' });
   *
   * // Check cache statistics
   * const stats = cache.getStats();
   * console.log(`Cache has ${stats.totalEntries} entries`);
   *
   * // Clean up for user logout
   * cache.invalidateUser('user-123');
   *
   * // Graceful shutdown
   * cache.shutdown();
   * ```
   *
   * @throws {CacheLimitExceededError} When cache limits are exceeded and eviction fails
   * @throws {ToolProviderCreationError} When factory function fails to create providers
   *
   * @see {@link UserToolProviderCacheConfig} for cache configuration options
   * @see {@link ToolProviderSet} for the structure of cached tool providers
   * @see {@link CachedToolProvider} for individual cache entry structure
   * @since 1.0.0
   */
  export type UserToolProviderCache = {
    getOrCreate(
      userId: string,
      sessionId: string,
      config: {
        writeEnabled: boolean;
        memoryDisabled: boolean;
        headers?: Record<string, string>;
      },
      factory: () => Promise<ToolProviderSet>,
    ): Promise<ToolProviderSet>;
    invalidateUser(userId: string): void;
    invalidateSession(userId: string, sessionId: string): void;
    clear(): void;
    getStats(): {
      totalEntries: number;
      userCounts: Record<string, number>;
      config: UserToolProviderCacheConfig;
    };
    shutdown(): void;
  };
}
