/**
 * ToolMap.ts
 *
 * @description
 * ToolMap manages chat tool metadata from the `chat_tool` table.
 *
 * This class is designed to be a singleton that provides fast, in-memory access
 * to tool definitions, while also handling the synchronization with the database.
 
 * @author Sean M. O'Brien <https://github.com/seanmobrien> 
 * @since v1.0.0
 */

import { type DbDatabaseType, type ChatToolType } from '@compliance-theater/database/orm';
import type {
  LanguageModelV2ProviderDefinedTool,
  LanguageModelV2FunctionTool,
} from '@ai-sdk/provider';

declare module '@/lib/ai/services/model-stats/tool-map' {
  /**
   * ToolMap manages chat tool metadata from the `chat_tool` table.
   *
   * This class is designed to be a singleton that provides fast, in-memory access
   * to tool definitions, while also handling the synchronization with the database.
   */
  export class ToolMap {
    /**
     * Synchronous singleton getter. Prefer getInstance() in async flows, as it
     * will only return a fully initialized instance.
     *
     * @returns The singleton ToolMap instance.
     */
    static get Instance(): ToolMap;

    /**
     * Return the singleton initialized ToolMap instance.
     *
     * @param db - Supports injecting a database instance for unit testing.
     * @returns Promise resolving to the initialized ToolMap.
     */
    static getInstance(db?: DbDatabaseType): Promise<ToolMap>;

    /**
     * Setup a mock instance for tests using in-memory entries.
     * Overwrites any existing singleton instance.
     *
     * @param records - Array of [toolId, ToolMapEntry] tuples to populate the mock ToolMap.
     * @returns The created ToolMap instance.
     */
    static setupMockInstance(
      records: (readonly [string, ChatToolType])[],
    ): ToolMap;

    /**
     * Reset the singleton (tests/reinit).
     * NOTE: Like all SingletonProvider singletons, the ToolMap is automatically
     * reset in test environments between tests. This is provided for legacy
     * compatibility and to support mid-test reset scenarios.
     */
    static reset(): void;

    constructor(
      entriesOrDb?: (readonly [string, ChatToolType])[] | DbDatabaseType,
    );

    /** Whether the instance has been initialized. */
    get initialized(): boolean;

    /** Promise that resolves when the instance is initialized. */
    get whenInitialized(): Promise<boolean>;

    /** Iterate entries as [id, record]. */
    get entries(): IterableIterator<[string, ChatToolType]>;

    /** Return all tool IDs. */
    get allIds(): string[];

    /** Return all tool names. */
    get allNames(): string[];

    /**
     * Lookup a tool record by id or name.
     *
     * @param idOrName - The tool ID or tool name to look up.
     * @returns The tool record if found, otherwise undefined.
     */
    record(idOrName: string): ChatToolType | undefined;

    /**
     * Lookup a tool record or throw when missing.
     *
     * @param idOrName - The tool ID or tool name to look up.
     * @returns The tool record.
     * @throws {ResourceNotFoundError} If the tool is not found.
     */
    recordOrThrow(idOrName: string): ChatToolType;

    /**
     * Return the tool name for an id or name.
     *
     * @param idOrName - The tool ID or tool name.
     * @returns The tool name if found, otherwise undefined.
     */
    name(idOrName: string): string | undefined;

    /**
     * Like name(), but throws if missing.
     *
     * @param idOrName - The tool ID or tool name.
     * @returns The tool name.
     * @throws {ResourceNotFoundError} If the tool name is not found.
     */
    nameOrThrow(idOrName: string): string;

    /**
     * Return the tool id for an id or name.
     *
     * @param idOrName - The tool ID or tool name.
     * @returns The tool ID if found, otherwise undefined.
     */
    id(idOrName: string): string | undefined;

    /**
     * Like id(), but throws if missing.
     *
     * @param idOrName - The tool ID or tool name.
     * @returns The tool ID.
     * @throws {ResourceNotFoundError} If the tool ID is not found.
     */
    idOrThrow(idOrName: string): string;

    /**
     * Whether a tool exists for id or name.
     *
     * @param idOrName - The tool ID or tool name.
     * @returns True if the tool exists, false otherwise.
     */
    contains(idOrName: string): boolean;

    /**
     * Scans for new tools and adds them to the database and the map.
     *
     * @param tools - A single tool or an array of tools to scan.
     * @returns Promise resolving to the number of new tools added.
     */
    scanForTools(
      tools:
        | Array<
            LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool
          >
        | (LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool),
    ): Promise<number>;

    /**
     * Refresh caches from database.
     *
     * @param db - Optional database instance to use for refreshing.
     * @returns Promise resolving to true when refreshed.
     */
    refresh(db?: DbDatabaseType): Promise<boolean>;
  }
}
