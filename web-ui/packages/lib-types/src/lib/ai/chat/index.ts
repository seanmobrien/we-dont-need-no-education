/**
 * AI Chat Types
 *
 * This module exports type definitions for chat functionality,
 * including chat messages, turns, and retry error handling.
 */
import type { APICallError } from 'ai';

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

/**
 * Runtime helpers
 * ---------------
 * Lightweight, pure functions to validate chat type structures at runtime.
 * These are intended primarily for tests and defensive programming at module
 * boundaries where untyped data (e.g., JSON) enters the system.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringOrNull = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;

const isNumberOrNull = (value: unknown): value is number | null =>
  typeof value === "number" || value === null;

const isStringArrayOrNull = (value: unknown): value is string[] | null =>
  value === null ||
  (Array.isArray(value) && value.every((item) => typeof item === "string"));

/**
 * Check whether a value conforms to the ChatMessage structure.
 */
export const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!isRecord(value)) {
    return false;
  }

  const { id, turnId, role, content, name, createdAt, metadata } = value;

  if (typeof id !== "string") return false;
  if (typeof turnId !== "number") return false;
  if (typeof role !== "string") return false;
  if (typeof content !== "string") return false;
  if (typeof createdAt !== "string") return false;

  if (name !== undefined && typeof name !== "string") return false;
  if (metadata !== undefined && metadata !== null && !isRecord(metadata)) {
    return false;
  }

  return true;
};

/**
 * Check whether a value conforms to the ChatTurn structure, including its
 * embedded ChatMessage items.
 */
export const isChatTurn = (value: unknown): value is ChatTurn => {
  if (!isRecord(value)) {
    return false;
  }

  const {
    turnId,
    createdAt,
    completedAt,
    modelName,
    messages,
    statusId,
    temperature,
    topP,
    latencyMs,
    warnings,
    errors,
    metadata,
  } = value;

  if (typeof turnId !== "number") return false;
  if (typeof createdAt !== "string") return false;
  if (!isStringOrNull(completedAt)) return false;
  if (!isStringOrNull(modelName)) return false;
  if (!Array.isArray(messages)) return false;
  if (!messages.every(isChatMessage)) return false;
  if (typeof statusId !== "number") return false;
  if (!isNumberOrNull(temperature)) return false;
  if (!isNumberOrNull(topP)) return false;
  if (!isNumberOrNull(latencyMs)) return false;
  if (!isStringArrayOrNull(warnings)) return false;
  if (!isStringArrayOrNull(errors)) return false;
  if (metadata !== null && metadata !== undefined && !isRecord(metadata)) {
    return false;
  }

  return true;
};

/**
 * Check whether a value conforms to the ChatDetails structure, including its
 * ordered collection of ChatTurn items.
 */
export const isChatDetails = (value: unknown): value is ChatDetails => {
  if (!isRecord(value)) {
    return false;
  }

  const { id, title, createdAt, turns } = value;

  if (typeof id !== "string") return false;
  if (!isStringOrNull(title)) return false;
  if (typeof createdAt !== "string") return false;
  if (!Array.isArray(turns)) return false;
  if (!turns.every(isChatTurn)) return false;

  return true;
};

/**
 * Helper to classify a RetryErrorInfo instance into a stable kind string.
 * This makes discriminated-union behavior easy to exercise in tests.
 */
export const getRetryErrorInfoKind = (
  info: RetryErrorInfo,
): "none" | "generic" | "retryable" | "nonRetryable" => {
  if (!info.isError) {
    return "none";
  }

  if (info.isRetry === true) {
    return "retryable";
  }

  if (info.isRetry === false) {
    return "nonRetryable";
  }

  return "generic";
};
