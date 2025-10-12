/**
 * Represents information about an error that may occur during a retryable operation.
 *
 * This type is a discriminated union that describes the state of an operation
 * with respect to errors and retry logic.
 *
 * - If `isError` is `false`, the input was not an error object and no retry or failure information is available.
 * - If `isError` is `true`, additional properties indicate whether a retry is possible,
 *   the error details, and the recommended retry delay.
 *
 * Variants:
 * - No error:
 *   - `isError: false`
 *   - `isRetry: never`
 *   - `error: never`
 *   - `retryAfter: never`
 * - Error with retry:
 *   - `isError: true`
 *   - `isRetry: true`
 *   - `error: APICallError`
 *   - `retryAfter: number` (milliseconds to wait before retrying)
 * - Error without retry:
 *   - `isError: true`
 *   - `isRetry: false`
 *   - `error: Error | APICallError`
 *   - `retryAfter: never`
 * - Generic error state (optional retry):
 *   - `isError: boolean`
 *   - `isRetry?: boolean`
 *   - `error?: APICallError | Error`
 *   - `retryAfter?: number`
 */
import { APICallError } from 'ai';

/**
 * Chat Type System
 * -----------------
 * Central, reusable domain model for chat history (turns & messages) plus
 * a discriminated union helper for retry-capable error surfaces.
 *
 * Design Goals:
 * - Single source of truth for shape shared by server routes, client hooks, and tests.
 * - Narrow, explicit field types (no 'any').
 * - Preserve raw values delivered by persistence / providers (e.g. modelName, tool/function meta) to retain diagnostic fidelity.
 * - Be forward‑extensible: New optional fields should not break existing consumers.
 *
 * Conventions:
 * - Timestamps are ISO 8601 strings (UTC) to avoid Date serialization ambiguity over the wire.
 * - Nullable fields use `null` instead of `undefined` for easier JSON round‑trips and DB mapping symmetry.
 * - Arrays default to `null` (meaning "not populated / unknown") vs empty array ("known empty") unless we always materialize them.
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


    
/**
 * A single atomic message within a chat turn. Represents user, assistant,
 * system, or tool/function output.
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


/**
 * A logical unit of interaction consisting of one or more related messages
 * (e.g., user prompt + assistant response + tool calls). Turn boundaries often
 * align with a single full model invocation cycle.
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
