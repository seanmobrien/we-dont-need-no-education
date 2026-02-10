import { trace, metrics, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import type {
  FlushResult,
  FlushContext,
  ChatHistoryContext,
  StreamHandlerResult,
} from './types';
import { isError } from '@compliance-theater/logger';

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
