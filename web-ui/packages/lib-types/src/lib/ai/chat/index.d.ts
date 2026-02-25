/**
 * @fileoverview Main type and guard exports for AI chat functionality.
 *
 * @module @compliance-theater/types/lib/ai/chat
 *
 * Central hub for chat session management, including message structures, turn
 * organization, and error handling with optional retry semantics. This module
 * provides the domain model for all chat history operations across the application.
 *
 * @remarks
 * **Module Organization**:
 * - **Types** (`types.d.ts`): Chat structures and error info unions
 * - **Guards** (`guards.d.ts`): Runtime type validation and helper utilities
 *
 * This module is the primary import point for consumers working with chat data.
 * For specialized use cases (e.g., only working with chat turns or only with
 * error classification), consumers can import directly from submodules:
 *
 * ```typescript
 * // Default: import everything
 * import { ChatDetails, isChatDetails } from '@compliance-theater/types/lib/ai/chat';
 *
 * // Specialized: import only chat types
 * import type { ChatMessage, ChatTurn } from '@compliance-theater/types/lib/ai/chat/types';
 *
 * // Specialized: import only error types
 * import type { RetryErrorInfo } from '@compliance-theater/types/lib/ai/chat/types';
 * import { getRetryErrorInfoKind } from '@compliance-theater/types/lib/ai/chat/guards';
 * ```
 *
 * **Design Philosophy**:
 * - Single source of truth for chat shapes across system boundaries
 * - Narrow, explicit field types (no `any`)
 * - Preserve raw values from persistence and providers for diagnostic fidelity
 * - Forward-compatible: new optional fields should not break existing consumers
 * - Use `null` instead of `undefined` for JSON serialization consistency
 *
 * @example
 * ```typescript
 * import type {
 *   ChatDetails,
 *   ChatTurn,
 *   ChatMessage,
 *   RetryErrorInfo,
 * } from '@compliance-theater/types/lib/ai/chat';
 * import {
 *   isChatDetails,
 *   isChatTurn,
 *   isChatMessage,
 *   getRetryErrorInfoKind,
 * } from '@compliance-theater/types/lib/ai/chat';
 *
 * // Load and validate complete chat session
 * async function loadChat(sessionId: string) {
 *   const json = await db.getSession(sessionId);
 *   const data = JSON.parse(json);
 *
 *   if (isChatDetails(data)) {
 *     // data is typed as ChatDetails with all turns and messages validated
 *     return data;
 *   }
 *   throw new Error('Invalid chat data');
 * }
 *
 * // Handle errors with retry classification
 * async function callWithRetry(operation: () => Promise<any>) {
 *   const result = await operation();
 *   const kind = getRetryErrorInfoKind(result);
 *
 *   switch (kind) {
 *     case 'retryable':
 *       await sleep(result.retryAfter);
 *       return callWithRetry(operation);
 *     case 'nonRetryable':
 *       throw result.error;
 *     case 'none':
 *       return result;
 *     case 'generic':
 *       console.warn('Ambiguous error state:', result);
 *       return result;
 *   }
 * }
 *
 * // Validate individual message
 * function addUserMessage(turnId: number, text: string) {
 *   const message: ChatMessage = {
 *     turnId,
 *     messageId: getNextMessageId(),
 *     role: 'user',
 *     content: text,
 *     messageOrder: getCurrentTurnLength(turnId),
 *     statusId: 1,
 *     providerId: null,
 *     toolInstanceId: null,
 *     optimizedContent: null,
 *   };
 *
 *   if (isChatMessage(message)) {
 *     appendMessage(message);
 *   }
 * }
 * ```
 *
 * @see {@link https://github.com/seanmobrien/we-dont-need-no-education|Repository}
 */

import type { APICallError } from 'ai';

declare module "@compliance-theater/types/lib/ai/chat" {
  // ============================================================================
  // Error And Retry Types
  // ============================================================================

  /**
   * Discriminated union representing error state and retry eligibility for an operation.
   *
   * This union captures the outcome of a retryable operation, distinguishing between
   * success (no error), classified failures (retryable vs non-retryable), and generic
   * error states for backward compatibility with legacy code paths.
   *
   * @remarks
   * **Variants**:
   * - **No Error** (`isError: false`): Operation succeeded
   * - **Retryable Error** (`isError: true`, `isRetry: true`): Well-formed retriable error with delay
   * - **Non-Retryable Error** (`isError: true`, `isRetry: false`): Permanent failure
   * - **Generic Error** (`isError: boolean`, optional retry fields): Legacy/transitional state
   *
   * Use {@link getRetryErrorInfoKind} to classify variants into 4 semantic categories:
   * `'none'`, `'retryable'`, `'nonRetryable'`, `'generic'`.
   *
   * @see {@link getRetryErrorInfoKind}
   *
   * @example
   * ```typescript
   * const result = await callAiService();
   *
   * if (result.isError && result.isRetry) {
   *   // Retryable error: safe to retry after delay
   *   await sleep(result.retryAfter);
   *   await retry();
   * } else if (result.isError) {
   *   // Non-retryable or unclassified: handle as permanent failure
   *   reportError(result.error);
   * } else {
   *   // Success
   *   processResult(result);
   * }
   * ```
   */
  export type RetryErrorInfo =
    | {
      /** Operation produced no error. */
      isError: false;
      isRetry: never;
      error?: never;
      retryAfter?: never;
    }
    | {
      /** Generic branch (legacy / transitional) when caller pre-classifies. */
      isError: boolean;
      isRetry?: boolean;
      error?: APICallError | Error;
      /** Milliseconds until retry is recommended (if present). */
      retryAfter?: number;
    }
    | {
      /** Error and the platform indicates safe retry. */
      isError: true;
      isRetry: true;
      error: APICallError;
      retryAfter: number;
    }
    | {
      /** Error but retry is not advised (validation, fatal, etc.). */
      isError: true;
      isRetry: false;
      error?: Error | APICallError;
      retryAfter?: never;
    };

  // ============================================================================
  // Message Types
  // ============================================================================

  /**
   * Single atomic message within a chat turn.
   *
   * Represents user input, assistant response, system message, or tool/function
   * output in a structured, queryable format. Messages are denormalized with
   * `turnId` for convenience and always reference their parent turn.
   *
   * @property turnId - Parent turn identifier (denormalized for lookup convenience)
   * @property messageId - Stable primary key for database persistence and deduplication
   * @property role - Author role, typically `'user'` | `'assistant'` | `'system'` | `'tool'`
   * @property content - Raw textual content, or `null` for tool/placeholder messages
   * @property messageOrder - Position within turn for rendering order
   * @property toolName - Tool name when `role === 'tool'` (nullable)
   * @property functionCall - Serialized function call payload from model (model-dependent format)
   * @property toolResult - Tool execution result or return value
   * @property statusId - Status code for message lifecycle (domain enum mapping)
   * @property providerId - Upstream provider identifier (e.g., `'azure-openai'`, `'google'`)
   * @property metadata - Arbitrary structured fields (token counts, annotations, etc.)
   * @property toolInstanceId - Correlation ID linking to external tool invocation context
   * @property optimizedContent - Pre-processed or condensed content variant (summaries, embeddings)
   *
   * @remarks
   * - Preserves raw values from providers to maintain diagnostic fidelity across system boundaries
   * - Uses `null` instead of `undefined` for JSON serialization consistency and database mapping
   * - Includes optional fields for role-specific data (tools, functions, metadata)
   * - Designed for efficient database querying and normalization
   *
   * @see {@link isChatMessage}
   * @see {@link ChatTurn}
   *
   * @example
   * ```typescript
   * const message: ChatMessage = {
   *   turnId: 1,
   *   messageId: 42,
   *   role: 'assistant',
   *   content: 'Hello! How can I help?',
   *   messageOrder: 1,
   *   statusId: 1,
   *   providerId: 'openai',
   *   toolInstanceId: null,
   *   optimizedContent: null,
   *   metadata: { tokenCount: 15 },
   * };
   *
   * if (isChatMessage(message)) {
   *   renderMessage(message);
   * }
   * ```
   */
  export interface ChatMessage {
    /** Parent turn identifier (denormalized for convenience). */
    turnId: number;
    /** Stable primary id for the message (DB / persistence). */
    messageId: number;
    /** Author role (e.g. 'user' | 'assistant' | 'system' | 'tool'). */
    role: string;
    /** Raw textual content (may be null for function/tool placeholder messages). */
    content: string | null;
    /** Position of the message within its turn (0-based or 1-based depending on ingest; treat as opaque ordering key). */
    messageOrder: number;
    /** Tool name when role === 'tool' (nullable if not applicable). */
    toolName?: string | null;
    /** Serialized function call payload (model dependent). */
    functionCall?: Record<string, unknown> | null;
    /** Tool execution result/return value. */
    toolResult?: Record<string, unknown> | null;
    /** Status code id for message lifecycle (domain enum mapping). */
    statusId: number;
    /** Upstream provider identifier (e.g. 'azure-openai', 'google'). */
    providerId: string | null;
    /** Arbitrary structured metadata (token counts, annotations, etc.). */
    metadata?: Record<string, unknown> | null;
    /** Tool instance correlation id linking to external invocation context. */
    toolInstanceId: string | null;
    /** Optimized / condensed variant of content (summaries, embeddings pre-processed text). */
    optimizedContent: string | null;
  }

  // ============================================================================
  // Turn Types
  // ============================================================================

  /**
   * Logical unit of interaction consisting of one or more related messages.
   *
   * A turn represents a single cycle of AI model invocation, typically encompassing:
   * - User prompt
   * - Model response
   * - Tool/function invocations and results
   * - Multiple back-and-forth exchanges before model completes
   *
   * Turn boundaries naturally align with model invocation cycles and serve as
   * the primary unit for tracking performance metrics, sampling parameters,
   * and error states.
   *
   * @property turnId - Sequential ID within chat (monotonic, guaranteed ordered)
   * @property createdAt - ISO 8601 timestamp when turn started
   * @property completedAt - ISO 8601 timestamp when completed, or `null` if in-progress
   * @property modelName - Model identifier (deployment or logical model name)
   * @property messages - Ordered array of messages in this turn
   * @property statusId - Turn status enum ID (pending, completed, failed, timed_out, etc.)
   * @property temperature - Sampling temperature used (for language models), or `null`
   * @property topP - Nucleus sampling top-p value (for language models), or `null`
   * @property latencyMs - Full latency from request dispatch to final token in milliseconds
   * @property warnings - Non-fatal issues surfaced during generation (or `null` if none)
   * @property errors - Fatal or blocking errors captured for diagnostics (or `null`)
   * @property metadata - Additional structured fields (token metrics, cost estimation, provider data)
   *
   * @remarks
   * - ISO 8601 timestamps (UTC) ensure unambiguous serialization across time zones
   * - Metrics like latency, warnings, and errors are nullable to handle varied provider APIs
   * - Sampling parameters are nullable for non-language models or when not applicable
   * - Message arrays are always materialized (not lazy-loaded) to keep turn self-contained
   * - Designed for efficient querying (turnId for lookup, createdAt for sorting)
   *
   * @see {@link isChatTurn}
   * @see {@link ChatMessage}
   * @see {@link ChatDetails}
   *
   * @example
   * ```typescript
   * const turn: ChatTurn = {
   *   turnId: 5,
   *   createdAt: '2026-02-16T12:00:00Z',
   *   completedAt: '2026-02-16T12:00:03Z',
   *   modelName: 'gpt-4-turbo',
   *   messages: [
   *     { \/* user message *\/ },
   *     { \/* assistant response *\/ },
   *   ],
   *   statusId: 1, // completed
   *   temperature: 0.7,
   *   topP: 0.9,
   *   latencyMs: 3200,
   *   warnings: null,
   *   errors: null,
   *   metadata: { totalTokens: 450, outputTokens: 120 },
   * };
   *
   * if (isChatTurn(turn)) {
   *   renderTurn(turn);
   * }
   * ```
   */
  export interface ChatTurn {
    /** Sequential id within a chat (monotonic). */
    turnId: number;
    /** ISO timestamp when the turn started. */
    createdAt: string;
    /** ISO timestamp when the turn completed (null if in-progress). */
    completedAt: string | null;
    /** Model identifier (deployment or logical model). */
    modelName: string | null;
    /** Messages exchanged within this turn (user prompt, assistant response, tool invocations). */
    messages: ChatMessage[];
    /** Turn status enum id. */
    statusId: number;
    /** Sampling temperature used (if applicable). */
    temperature: number | null;
    /** Nucleus sampling top-p value (if applicable). */
    topP: number | null;
    /** Full latency in milliseconds (request -> final token). */
    latencyMs: number | null;
    /** Non-fatal issues surfaced during generation. */
    warnings: string[] | null;
    /** Fatal or blocking errors captured for diagnostics. */
    errors: string[] | null;
    /** Additional structured fields (token metrics, cost, provider raw). */
    metadata: Record<string, unknown> | null;
  }

  // ============================================================================
  // Chat Session Types
  // ============================================================================

  /**
   * Complete chat session with metadata and ordered turn history.
   *
   * Represents the top-level chat entity, serving as the primary data structure
   * for loading, saving, and restoring entire conversation sessions. Contains
   * session-wide metadata and an immutable ordered sequence of turns.
   *
   * @property id - Unique chat identifier (UUID or ULID format)
   * @property title - Human-readable title, or `null` until derived from chat content
   * @property createdAt - ISO 8601 creation timestamp
   * @property turns - Immutable ordered collection of conversation turns
   *
   * @remarks
   * - Session ID should be globally unique for reliable lookup and deduplication
   * - Title is typically null on creation and populated after first turn completion
   * - Turn order is stable and meaningful; earlier turns have lower turnIds
   * - Use {@link isChatDetails} to validate complete session data for integrity
   * - Designed as top-level entity for persistence and API responses
   *
   * @see {@link isChatDetails}
   * @see {@link ChatTurn}
   * @see {@link ChatMessage}
   *
   * @example
   * ```typescript
   * const chat: ChatDetails = {
   *   id: 'abc123-def456-ghi789',
   *   title: 'Q&A: TypeScript Best Practices',
   *   createdAt: '2026-02-16T12:00:00Z',
   *   turns: [
   *     { \/* first turn *\/ },
   *     { \/* second turn *\/ },
   *     // ...
   *   ],
   * };
   *
   * // Completely validate chat session structure
   * if (isChatDetails(chat)) {
   *   // chat is typed as ChatDetails; all turns and messages are guaranteed valid
   *   saveChatSession(chat);
   * } else {
   *   throw new Error('Chat session failed validation');
   * }
   * ```
   */
  export interface ChatDetails {
    /** Unique chat identifier (UUID or ULID). */
    id: string;
    /** Human readable title (nullable until derived). */
    title: string | null;
    /** Chat creation timestamp (ISO). */
    createdAt: string;
    /** Ordered collection of turns. */
    turns: ChatTurn[];
  }

  // ============================================================================
  // Type Guard Functions
  // ============================================================================

  /**
   * Type guard to validate that a value conforms to the `ChatMessage` structure.
   *
   * Performs deep validation of:
   * - Required fields: `turnId`, `messageId`, `role`, `content`, `messageOrder`, `statusId`, etc.
   * - Field types: numbers for IDs, strings for content, correct nullable handling
   * - Optional nested objects: `metadata` objects if present
   *
   * @param value - The unknown value to validate.
   * @returns `true` if `value` conforms to the `ChatMessage` structure;
   *          otherwise `false`.
   *
   * @remarks
   * Use this at module boundaries where untyped data (JSON, external APIs) enters the system.
   * The guard validates the complete message structure before use in business logic.
   *
   * @see {@link ChatMessage}
   * @see {@link isChatTurn}
   *
   * @example
   * ```typescript
   * const incomingData = await parseWebSocketMessage();
   *
   * if (isChatMessage(incomingData)) {
   *   // incomingData is typed as ChatMessage
   *   addMessageToHistory(incomingData);
   * } else {
   *   logValidationError('Invalid message structure', incomingData);
   * }
   * ```
   */
  export function isChatMessage(value: unknown): value is ChatMessage;

  /**
   * Type guard to validate that a value conforms to the `ChatTurn` structure.
   *
   * Performs recursive deep validation of:
   * - Turn-level fields: `turnId`, `createdAt`, `completedAt`, `modelName`, `statusId`, etc.
   * - Sampling parameters: `temperature`, `topP` with correct nullable handling
   * - Arrays: `messages` array (recursively validates each message), `warnings`, `errors`
   * - Metadata: `metadata` object structure if present
   *
   * @param value - The unknown value to validate.
   * @returns `true` if `value` conforms to the `ChatTurn` structure including
   *          all nested messages; otherwise `false`.
   *
   * @remarks
   * This guard recursively validates all nested `ChatMessage` items, ensuring
   * the complete turn structure and all contained messages are well-formed.
   * Expensive for large turns; cache validation results if calling repeatedly.
   *
   * @see {@link ChatTurn}
   * @see {@link isChatMessage}
   * @see {@link isChatDetails}
   *
   * @example
   * ```typescript
   * const turnData = await fetchTurnFromDatabase();
   *
   * if (isChatTurn(turnData)) {
   *   // turnData is typed as ChatTurn with all messages guaranteed valid
   *   const avgLatency = turnData.latencyMs ?? 0;
   *   renderTurnMessages(turnData.messages);
   * } else {
   *   logValidationError('Invalid turn data', turnData);
   * }
   * ```
   */
  export function isChatTurn(value: unknown): value is ChatTurn;

  /**
   * Type guard to validate that a value conforms to the `ChatDetails` structure.
   *
   * Performs complete end-to-end validation of:
   * - Session-level fields: `id`, `title`, `createdAt`
   * - Turn ordering: validates `turns` array exists and contains valid turns
   * - Nested validation: recursively validates every turn and contained message
   *
   * This is the highest-level guard and ensures complete structural integrity
   * when loading or importing chat data from external sources.
   *
   * @param value - The unknown value to validate.
   * @returns `true` if `value` conforms to the complete `ChatDetails` structure
   *          including all nested turns and messages; otherwise `false`.
   *
   * @remarks
   * Most expensive validation guard as it recursively validates entire chat history.
   * Typically called once on load rather than repeatedly. Cache validation results
   * if needed for performance-critical paths.
   *
   * @see {@link ChatDetails}
   * @see {@link isChatTurn}
   * @see {@link isChatMessage}
   *
   * @example
   * ```typescript
   * const sessionJson = localStorage.getItem('chatSession');
   * const parsed = JSON.parse(sessionJson);
   *
   * if (isChatDetails(parsed)) {
   *   // parsed is typed as ChatDetails; safe to restore entire session
   *   // All turns, messages, and nested structures are guaranteed valid
   *   restoreChatSession(parsed);
   * } else {
   *   console.error('Chat session data is corrupted or outdated');
   *   startNewSession();
   * }
   * ```
   */
  export function isChatDetails(value: unknown): value is ChatDetails;

  /**
   * Classifies a `RetryErrorInfo` discriminated union into one of four semantic categories.
   *
   * Maps the complex discriminated union structure into a simple string category
   * for straightforward error handling logic in switch statements and conditionals.
   *
   * @param info - The `RetryErrorInfo` instance to classify.
   * @returns One of four string categories:
   *   - `'none'`: No error occurred; operation succeeded (`isError: false`)
   *   - `'generic'`: Unclassified or transitional error state (for backward compatibility)
   *   - `'retryable'`: Recoverable error with safe retry delay
   *   - `'nonRetryable'`: Permanent failure; do not retry
   *
   * @remarks
   * Enables pattern matching without deeply nested type narrowing:
   * ```
   * // Without helper:
   * if (result.isError) {
   *   if (result.isRetry) { \/* ... *\/ }
   *   else { \/* ... *\/ }
   * } else { \/* ... *\/ }
   *
   * // With helper:
   * switch (getRetryErrorInfoKind(result)) {
   *   case 'retryable': \/* ... *\/
   *   case 'nonRetryable': \/* ... *\/
   *   case 'none': \/* ... *\/
   * }
   * ```
   *
   * @see {@link RetryErrorInfo}
   *
   * @example
   * ```typescript
   * const result = await callAiService(prompt);
   * const kind = getRetryErrorInfoKind(result);
   *
   * switch (kind) {
   *   case 'none':
   *     console.log('Success:', result);
   *     break;
   *
   *   case 'retryable':
   *     console.log(`Retrying after ${result.retryAfter}ms...`);
   *     await sleep(result.retryAfter);
   *     await callAiService(prompt); // retry
   *     break;
   *
   *   case 'nonRetryable':
   *     console.error('Fatal error:', result.error?.message);
   *     displayErrorToUser(result.error);
   *     break;
   *
   *   case 'generic':
   *   default:
   *     console.warn('Ambiguous error state:', result);
   *     break;
   * }
   * ```
   */
  export function getRetryErrorInfoKind(
    info: RetryErrorInfo,
  ): "none" | "generic" | "retryable" | "nonRetryable";
}
