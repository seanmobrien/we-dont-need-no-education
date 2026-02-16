/**
 * @fileoverview Type declarations for AI core types.
 *
 * @module @compliance-theater/types/lib/ai/core/types
 *
 * Provides ambient type declarations for core AI type system definitions, including
 * annotated message types for error handling and retry logic, and enumerated types
 * for AI model and provider identification.
 *
 * @remarks
 * This module defines the stable, reusable type contracts used throughout the AI
 * system for:
 * - **Message Types**: Discriminated union types for structured error and retry
 *   messages in AI service communication.
 * - **Model Identification**: Branded string types and constant arrays for all
 *   supported model identifiers (LoFi, HiFi, embeddings, provider-specific variants).
 * - **Provider Identification**: Branded string types for supported AI service
 *   providers (Azure, Google, OpenAI).
 *
 * All types are narrow, explicit, and preserve raw values from persistence and
 * external services to maintain diagnostic fidelity. The types are designed to be
 * forward-compatible; new optional fields should not break existing consumers.
 *
 * @example
 * ```typescript
 * import type {
 *   AiModelType,
 *   AiLanguageModelType,
 *   AnnotatedRetryMessage,
 * } from '@compliance-theater/types/ai/core';
 *
 * // Use model types for configuration
 * const config: Record<AiLanguageModelType, ModelConfig> = {
 *   hifi: { tokens: 4096, temperature: 0.7 },
 *   lofi: { tokens: 2048, temperature: 0.5 },
 *   // ...
 * };
 *
 * // Handle retry messages with type safety
 * function handleRetry(message: AnnotatedRetryMessage) {
 *   const retryTime = new Date(message.data.retryAt);
 *   console.log(`${message.data.model} available at ${retryTime}`);
 * }
 * ```
 *
 * @see {@link unions} for constant arrays and union type definitions
 * @see {@link guards} for runtime type validation utilities
 */

import type {
  AiModelType,
  AiLanguageModelType,
  AiProviderType,
} from "./unions";

declare module "@compliance-theater/types/lib/ai/core/types" {
  /**
   * Utility type for extracting the value type from an object's properties.
   *
   * @template ObjectType - The object type to extract values from.
   * @template ValueType - Optional specific key(s) to extract; defaults to all keys.
   *
   * @example
   * ```typescript
   * type Config = { host: string; port: number; timeout: number };
   * type ConfigValue = ValueOf<Config>; // string | number
   * ```
   */
  export type ValueOf<
    ObjectType,
    ValueType extends keyof ObjectType = keyof ObjectType,
  > = ObjectType[ValueType];

  /**
   * Base type for annotated error messages.
   *
   * Represents a discriminated union of error message types used for structured
   * error communication between AI services and consumers. The `type` field acts
   * as the discriminator.
   *
   * Members:
   * - `AnnotatedErrorPart<'error-retry'>`: Error with retry-after delay in seconds
   * - `AnnotatedErrorPart<'error-notify-retry'>`: Error with scheduled retry time (ISO 8601)
   *
   * @see {@link AnnotatedErrorMessage}
   * @see {@link AnnotatedRetryMessage}
   */
  export type AnnotatedErrorMessageBase =
    | {
        type: "data-error-retry";
        data: {
          retryAfter: number;
          reason: string;
        };
      }
    | {
        type: "data-error-notify-retry";
        data: {
          retryAt: string;
          model: AiModelType;
        };
      };

  /**
   * Discriminated part of the annotated error message union.
   *
   * @template TError - The specific error type key ('error-retry' or 'error-notify-retry')
   *
   * Extracts a single variant from the error message union, useful for creating
   * type-safe handlers for specific error conditions.
   *
   * @example
   * ```typescript
   * type RetryErrorOnly = AnnotatedErrorPart<'error-retry'>;
   * // Equivalent to:
   * // { type: 'data-error-retry'; data: { retryAfter: number; reason: string } }
   * ```
   */
  export type AnnotatedErrorPart<
    TError extends keyof {
      "error-retry": unknown;
      "error-notify-retry": unknown;
    },
  > = TError extends "error-retry"
    ? {
        type: "data-error-retry";
        data: {
          retryAfter: number;
          reason: string;
        };
      }
    : TError extends "error-notify-retry"
      ? {
          type: "data-error-notify-retry";
          data: {
            retryAt: string;
            model: AiModelType;
          };
        }
      : never;

  /**
   * Annotated error message with retry-after delay in seconds.
   *
   * Represents an error condition where the caller should wait for the specified
   * number of seconds before retrying the operation. The reason field provides
   * diagnostic information about why the error occurred.
   *
   * @property type - Discriminator: always `'data-error-retry'`
   * @property data.reason - Human-readable description of the error
   * @property data.retryAfter - Seconds to wait before retrying
   *
   * @example
   * ```typescript
   * const error: AnnotatedErrorMessage = {
   *   type: 'data-error-retry',
   *   data: {
   *     reason: 'Rate limit exceeded',
   *     retryAfter: 30,
   *   }
   * };
   * ```
   */
  export type AnnotatedErrorMessage = AnnotatedErrorPart<"error-retry">;

  /**
   * Annotated retry message with scheduled retry time.
   *
   * Represents an error condition where a specific model will be available again
   * at a scheduled time. The retryAt field contains an ISO 8601 datetime string,
   * allowing clients to schedule precise retry attempts.
   *
   * Use this type when scheduling batch retries or coordinating retry logic
   * across multiple concurrent requests for the same model.
   *
   * @property type - Discriminator: always `'data-error-notify-retry'`
   * @property data.model - The AI model that triggered this error
   * @property data.retryAt - ISO 8601 datetime when the model will be available
   *
   * @example
   * ```typescript
   * const retryNotification: AnnotatedRetryMessage = {
   *   type: 'data-error-notify-retry',
   *   data: {
   *     model: 'google:hifi',
   *     retryAt: '2026-02-16T14:30:00Z',
   *   }
   * };
   * ```
   */
  export type AnnotatedRetryMessage = AnnotatedErrorPart<"error-notify-retry">;

  /**
   * Union of all annotated message types.
   *
   * Represents any structured message that may be exchanged by the AI system,
   * particularly for error reporting and retry coordination. Use discriminated
   * union narrowing or type guards to handle specific message variants.
   *
   * @see {@link isAnnotatedMessageBase}
   * @see {@link isAnnotatedErrorMessage}
   * @see {@link isAnnotatedRetryMessage}
   */
  export type AnnotatedMessage =
    | AnnotatedErrorMessage
    | AnnotatedRetryMessage
    | AnnotatedErrorMessageBase;

  export type { AiModelType, AiLanguageModelType, AiProviderType };
}
