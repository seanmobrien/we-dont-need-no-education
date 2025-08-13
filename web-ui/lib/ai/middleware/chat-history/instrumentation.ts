/**
 * @fileoverview OpenTelemetry Instrumentation for Chat History Middleware
 *
 * This module provides comprehensive observability for the chat history middleware system,
 * focusing on error tracking, performance monitoring, and operational metrics. It captures
 * key metrics from flush operations and provides structured error attribution.
 *
 * @module lib/ai/middleware/chat-history/instrumentation
 * @version 1.0.0
 * @since 2025-07-25
 */

import { trace, metrics, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import type {
  FlushResult,
  FlushContext,
  ChatHistoryContext,
  StreamHandlerResult,
} from './types';
import { isError } from '@/lib/react-util/_utility-methods';

// Tracer and meter instances for chat history operations
const tracer = trace.getTracer('chat-history-middleware', '1.0.0');
const meter = metrics.getMeter('chat-history-middleware', '1.0.0');

// Metrics instruments
const flushOperationHistogram = meter.createHistogram(
  'chat_history_flush_duration',
  {
    description: 'Duration of chat history flush operations in milliseconds',
    unit: 'ms',
  },
);

const flushOperationCounter = meter.createCounter(
  'chat_history_flush_operations_total',
  {
    description: 'Total number of chat history flush operations',
  },
);

const streamChunkCounter = meter.createCounter(
  'chat_history_stream_chunks_total',
  {
    description: 'Total number of stream chunks processed',
  },
);

const textLengthHistogram = meter.createHistogram('chat_history_text_length', {
  description: 'Length of generated text content in characters',
  unit: 'chars',
});

const errorCounter = meter.createCounter('chat_history_errors_total', {
  description: 'Total number of errors in chat history operations',
});

/**
 * Instruments a flush operation with comprehensive observability.
 *
 * Creates a span for the flush operation and records detailed metrics including
 * duration, text length, success/failure rates, and error attribution.
 *
 * @param context - The flush context containing operation details
 * @param operation - The async flush operation to instrument
 * @returns Promise resolving to the flush result with added observability
 *
 * @example
 * ```typescript
 * const result = await instrumentFlushOperation(flushContext, async () => {
 *   return await handleFlush(context, config);
 * });
 * ```
 */
export async function instrumentFlushOperation<T extends FlushResult>(
  context: FlushContext,
  operation: () => Promise<T>,
): Promise<T> {
  const span = tracer.startSpan('chat_history.flush', {
    kind: SpanKind.INTERNAL,
    attributes: {
      'chat.id': context.chatId,
      'chat.turn_id': context.turnId || 0,
      'chat.message_id': context.messageId || 0,
      'chat.text_length': context.generatedText.length,
      'operation.type': 'flush',
    },
  });

  const startTime = Date.now();

  try {
    const result = await operation();

    // Record success metrics
    const duration = Date.now() - startTime;

    span.setAttributes({
      'operation.success': result.success,
      'operation.duration_ms': result.processingTimeMs,
      'operation.text_length': result.textLength,
      'operation.flush_duration_ms': duration,
    });

    // Record histograms for performance analysis
    flushOperationHistogram.record(result.processingTimeMs, {
      operation: 'flush',
      success: result.success.toString(),
      has_error: (!!result.error).toString(),
    });

    textLengthHistogram.record(result.textLength, {
      operation: 'flush',
      success: result.success.toString(),
    });

    // Count successful operations
    flushOperationCounter.add(1, {
      operation: 'flush',
      success: result.success.toString(),
      has_error: (!!result.error).toString(),
    });

    if (result.error) {
      // Record error details
      span.recordException(result.error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: result.error.message,
      });

      span.setAttributes({
        'error.type': result.error.constructor.name,
        'error.message': result.error.message,
        'error.retry_recommended': result.retryRecommended || false,
      });

      errorCounter.add(1, {
        operation: 'flush',
        error_type: result.error.constructor.name,
        retry_recommended: (result.retryRecommended || false).toString(),
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    // Add metadata if available
    if (result.metadata) {
      span.setAttributes({
        'operation.metadata_keys': Object.keys(result.metadata).join(','),
      });
    }

    return result;
  } catch (error) {
    const errorObj = isError(error) ? error : new Error(String(error));

    span.recordException(errorObj);
    span.setStatus({ code: SpanStatusCode.ERROR, message: errorObj.message });

    span.setAttributes({
      'operation.success': false,
      'error.type': errorObj.constructor.name,
      'error.message': errorObj.message,
    });

    errorCounter.add(1, {
      operation: 'flush',
      error_type: errorObj.constructor.name,
      retry_recommended: 'unknown',
    });

    flushOperationCounter.add(1, {
      operation: 'flush',
      success: 'false',
      has_error: 'true',
    });

    throw error;
  } finally {
    span.end();
  }
}

/**
 * Instruments stream chunk processing with lightweight observability.
 *
 * Records metrics for stream chunk processing including chunk types,
 * processing success rates, and text accumulation patterns.
 *
 * @param chunkType - The type of stream chunk being processed
 * @param context - The stream handler context
 * @param operation - The async chunk processing operation
 * @returns Promise resolving to the processing result
 *
 * @example
 * ```typescript
 * const result = await instrumentStreamChunk('text-delta', context, async () => {
 *   return await handleTextDelta(chunk, context);
 * });
 * ```
 */
export async function instrumentStreamChunk(
  chunkType: string,
  context: { chatId: string; turnId: number; messageId?: number },
  operation: () => Promise<StreamHandlerResult>,
): Promise<StreamHandlerResult> {
  try {
    const result = await operation();

    // Record chunk processing metrics
    streamChunkCounter.add(1, {
      chunk_type: chunkType,
      success: result.success.toString(),
    });

    if (!result.success) {
      errorCounter.add(1, {
        operation: 'stream_chunk',
        error_type: 'processing_failure',
        chunk_type: chunkType,
      });
    }

    return result;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const span = tracer.startSpan('chat_history.chunk_error', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'operation.type': 'process_chunk',
        code: SpanStatusCode.ERROR,
        'error.message': errorObj.message,
        'operation.success': false,
        'error.type': errorObj.constructor.name,
      },
    });
    try {
      span.recordException(errorObj);

      streamChunkCounter.add(1, {
        chunk_type: chunkType,
        success: 'false',
      });

      errorCounter.add(1, {
        operation: 'stream_chunk',
        error_type: errorObj.constructor.name,
        chunk_type: chunkType,
      });

      throw error;
    } finally {
      span.end();
    }
  }
}
/**
 * Instruments chat history middleware initialization.
 *
 * Creates a span for the middleware setup and records configuration attributes
 * for observability and debugging purposes.
 *
 * @param context - The chat history context being initialized
 * @param operation - The async initialization operation
 * @returns Promise resolving to the initialization result
 *
 * @example
 * ```typescript
 * const result = await instrumentMiddlewareInit(context, async () => {
 *   return await initializeMessagePersistence(context, params);
 * });
 * ```
 */
export async function instrumentMiddlewareInit<T>(
  context: ChatHistoryContext,
  operation: () => Promise<T>,
): Promise<T> {
  const span = tracer.startSpan('chat_history.middleware_init', {
    kind: SpanKind.INTERNAL,
    attributes: {
      'operation.type': 'middleware_init',
      // Add any context-specific attributes here
    },
  });

  try {
    const result = await operation();

    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttributes({
      'operation.success': true,
    });

    return result;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    span.recordException(errorObj);
    span.setStatus({ code: SpanStatusCode.ERROR, message: errorObj.message });

    span.setAttributes({
      'operation.success': false,
      'error.type': errorObj.constructor.name,
      'error.message': errorObj.message,
    });

    errorCounter.add(1, {
      operation: 'middleware_init',
      error_type: errorObj.constructor.name,
    });

    throw error;
  } finally {
    span.end();
  }
}

/**
 * Records a processing queue operation metric.
 *
 * Lightweight metric recording for queue operations without creating spans.
 * Useful for high-frequency operations where span overhead might be excessive.
 *
 * @param operation - The type of queue operation
 * @param success - Whether the operation succeeded
 * @param queueSize - Current size of the processing queue
 *
 * @example
 * ```typescript
 * recordQueueOperation('enqueue', true, 5);
 * recordQueueOperation('process', false, 4);
 * ```
 */
export function recordQueueOperation(
  operation: 'enqueue' | 'process' | 'complete',
  success: boolean,
  queueSize?: number,
): void {
  const queueOperationCounter = meter.createCounter(
    'chat_history_queue_operations_total',
    {
      description: 'Total number of processing queue operations',
    },
  );

  queueOperationCounter.add(1, {
    operation,
    success: success.toString(),
  });

  if (queueSize !== undefined) {
    const queueSizeGauge = meter.createUpDownCounter(
      'chat_history_queue_size',
      {
        description: 'Current size of the processing queue',
      },
    );

    queueSizeGauge.add(operation === 'enqueue' ? 1 : -1, {
      operation,
    });
  }
}

/**
 * Creates a custom error with additional context for better observability.
 *
 * Enhances error objects with chat-specific context that will be captured
 * by the instrumentation spans and metrics.
 *
 * @param message - The error message
 * @param context - Chat context for error attribution
 * @param originalError - Optional original error to wrap
 * @returns Enhanced error with chat context
 *
 * @example
 * ```typescript
 * throw createChatHistoryError(
 *   'Failed to persist message',
 *   { chatId: 'chat-123', turnId: 1 },
 *   originalError
 * );
 * ```
 */
export function createChatHistoryError(
  message: string,
  context: { chatId: string; turnId?: number; messageId?: number },
  originalError?: Error,
): Error {
  const error = new Error(message);
  error.name = 'ChatHistoryError';
  error.cause = originalError;

  // Add structured context to error for better observability
  Object.assign(error, {
    chatContext: {
      chatId: context.chatId,
      turnId: context.turnId,
      messageId: context.messageId,
    },
  });

  return error;
}
