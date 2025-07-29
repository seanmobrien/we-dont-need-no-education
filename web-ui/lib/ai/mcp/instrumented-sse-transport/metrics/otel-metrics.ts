/**
 * @fileoverview OpenTelemetry Metrics Setup for MCP Transport
 * 
 * This module centralizes all OpenTelemetry metric definitions and provides
 * utilities for recording transport-related metrics.
 */

import { trace, metrics } from '@opentelemetry/api';

// OTEL Configuration
export const OTEL_MODE = process.env.MCP_OTEL_MODE?.toUpperCase() || 'WARNING';
export const DEBUG_MODE = OTEL_MODE === 'DEBUG';

// OTEL Instrumentation
export const tracer = trace.getTracer('mcp-client-transport', '1.0.0');
export const meter = metrics.getMeter('mcp-client-transport', '1.0.0');

// Connection Metrics
export const connectionCounter = meter.createCounter('mcp_connections_total', {
  description: 'Total number of MCP connection attempts',
});

// Message Metrics
export const messageCounter = meter.createCounter('mcp_messages_total', {
  description: 'Total number of MCP messages sent/received',
});

export const messageSizeHistogram = meter.createHistogram('mcp_message_size_bytes', {
  description: 'Size of MCP messages in bytes',
});

// Error Metrics
export const errorCounter = meter.createCounter('mcp_errors_total', {
  description: 'Total number of MCP transport errors',
});

// Duration Metrics
export const sessionDurationHistogram = meter.createHistogram(
  'mcp_session_duration_ms',
  {
    description: 'Duration of MCP sessions in milliseconds',
  },
);

export const operationDurationHistogram = meter.createHistogram(
  'mcp_operation_duration_ms',
  {
    description: 'Duration of MCP operations in milliseconds',
  },
);

// Active Counters
export const activeSessionsGauge = meter.createUpDownCounter('mcp_active_sessions', {
  description: 'Number of currently active MCP sessions',
});

export const activeToolCallsGauge = meter.createUpDownCounter(
  'mcp_active_tool_calls',
  {
    description: 'Number of currently active MCP tool calls',
  },
);

// Tool Call Metrics
export const toolCallCounter = meter.createCounter('mcp_tool_calls_total', {
  description: 'Total number of MCP tool calls initiated',
});

export const toolCallCompletionCounter = meter.createCounter(
  'mcp_tool_call_completions_total',
  {
    description: 'Total number of MCP tool call completions',
  },
);

/**
 * Utility class for recording common metric patterns
 */
export class MetricsRecorder {
  static recordConnection(url: string, operation: string, status: string) {
    connectionCounter.add(1, {
      'mcp.transport.url': url,
      'mcp.transport.operation': operation,
      'mcp.transport.status': status,
    });
  }

  static recordMessage(url: string, direction: 'inbound' | 'outbound', method: string) {
    messageCounter.add(1, {
      'mcp.transport.url': url,
      'mcp.transport.direction': direction,
      'mcp.message.method': method,
    });
  }

  static recordMessageSize(size: number, direction: 'inbound' | 'outbound', method: string) {
    messageSizeHistogram.record(size, {
      'mcp.transport.direction': direction,
      'mcp.message.method': method,
    });
  }

  static recordError(operation: string, errorType: string) {
    errorCounter.add(1, {
      'mcp.transport.operation': operation,
      'mcp.transport.error_type': errorType,
    });
  }

  static recordOperationDuration(duration: number, operation: string, status: string) {
    operationDurationHistogram.record(duration, {
      'mcp.transport.operation': operation,
      'mcp.transport.status': status,
    });
  }

  static recordSessionDuration(duration: number, url: string, sessionType: string) {
    sessionDurationHistogram.record(duration, {
      'mcp.transport.url': url,
      'mcp.transport.session_type': sessionType,
    });
  }

  static recordToolCall(url: string, method: string) {
    toolCallCounter.add(1, {
      'mcp.transport.url': url,
      'mcp.tool.method': method,
    });
  }

  static recordToolCallCompletion(url: string, method: string, reason: string) {
    toolCallCompletionCounter.add(1, {
      'mcp.transport.url': url,
      'mcp.tool.method': method,
      'mcp.tool.completion_reason': reason,
    });
  }
}
