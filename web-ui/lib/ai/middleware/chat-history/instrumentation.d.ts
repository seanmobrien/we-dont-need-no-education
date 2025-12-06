/**
 * @fileoverview OpenTelemetry Instrumentation for Chat History Middleware.
 *
 * This module provides comprehensive observability for the chat history middleware system,
 * focusing on error tracking, performance monitoring, and operational metrics. It captures
 * key metrics from flush operations and provides structured error attribution.
 */

import type {
  FlushResult,
  FlushContext,
  ChatHistoryContext,
  StreamHandlerResult,
} from './types';

declare module '@/lib/ai/middleware/chat-history/instrumentation' {
  /**
   * Instruments a flush operation with comprehensive observability.
   *
   * Creates a span for the flush operation and records detailed metrics including
   * duration, text length, success/failure rates, and error attribution.
   *
   * @param context - The flush context containing operation details.
   * @param operation - The async flush operation to instrument.
   * @returns {Promise<T>} Promise resolving to the flush result with added observability.
   */
  export function instrumentFlushOperation<T extends FlushResult>(
    context: FlushContext,
    operation: () => Promise<T>,
  ): Promise<T>;

  /**
   * Instruments stream chunk processing with lightweight observability.
   *
   * Records metrics for stream chunk processing including chunk types,
   * processing success rates, and text accumulation patterns.
   *
   * @param chunkType - The type of stream chunk being processed.
   * @param context - The stream handler context.
   * @param operation - The async chunk processing operation.
   * @returns {Promise<StreamHandlerResult>} Promise resolving to the processing result.
   */
  export function instrumentStreamChunk(
    chunkType: string,
    context: { chatId: string; turnId: number; messageId?: number },
    operation: () => Promise<StreamHandlerResult>,
  ): Promise<StreamHandlerResult>;

  /**
   * Instruments chat history middleware initialization.
   *
   * Creates a span for the middleware setup and records configuration attributes
   * for observability and debugging purposes.
   *
   * @param context - The chat history context being initialized.
   * @param operation - The async initialization operation.
   * @returns {Promise<T>} Promise resolving to the initialization result.
   */
  export function instrumentMiddlewareInit<T>(
    context: ChatHistoryContext,
    operation: () => Promise<T>,
  ): Promise<T>;

  /**
   * Records a processing queue operation metric.
   *
   * Lightweight metric recording for queue operations without creating spans.
   * Useful for high-frequency operations where span overhead might be excessive.
   *
   * @param operation - The type of queue operation.
   * @param success - Whether the operation succeeded.
   * @param queueSize - Current size of the processing queue.
   */
  export function recordQueueOperation(
    operation: 'enqueue' | 'process' | 'complete',
    success: boolean,
    queueSize?: number,
  ): void;

  /**
   * Creates a custom error with additional context for better observability.
   *
   * Enhances error objects with chat-specific context that will be captured
   * by the instrumentation spans and metrics.
   *
   * @param message - The error message.
   * @param context - Chat context for error attribution.
   * @param originalError - Optional original error to wrap.
   * @returns {Error} Enhanced error with chat context.
   */
  export function createChatHistoryError(
    message: string,
    context: { chatId: string; turnId?: number; messageId?: number },
    originalError?: Error,
  ): Error;
}
