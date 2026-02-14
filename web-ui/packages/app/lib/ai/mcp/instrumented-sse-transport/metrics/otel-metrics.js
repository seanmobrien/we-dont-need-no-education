import { trace, metrics } from '@opentelemetry/api';
export const OTEL_MODE = process.env.MCP_OTEL_MODE?.toUpperCase() || 'WARNING';
export const DEBUG_MODE = OTEL_MODE === 'DEBUG';
export const tracer = trace.getTracer('mcp-client-transport', '1.0.0');
export const meter = metrics.getMeter('mcp-client-transport', '1.0.0');
export const connectionCounter = meter.createCounter('mcp_connections_total', {
    description: 'Total number of MCP connection attempts',
});
export const messageCounter = meter.createCounter('mcp_messages_total', {
    description: 'Total number of MCP messages sent/received',
});
export const messageSizeHistogram = meter.createHistogram('mcp_message_size_bytes', {
    description: 'Size of MCP messages in bytes',
});
export const errorCounter = meter.createCounter('mcp_errors_total', {
    description: 'Total number of MCP transport errors',
});
export const sessionDurationHistogram = meter.createHistogram('mcp_session_duration_ms', {
    description: 'Duration of MCP sessions in milliseconds',
});
export const operationDurationHistogram = meter.createHistogram('mcp_operation_duration_ms', {
    description: 'Duration of MCP operations in milliseconds',
});
export const activeSessionsGauge = meter.createUpDownCounter('mcp_active_sessions', {
    description: 'Number of currently active MCP sessions',
});
export const activeToolCallsGauge = meter.createUpDownCounter('mcp_active_tool_calls', {
    description: 'Number of currently active MCP tool calls',
});
export const toolCallCounter = meter.createCounter('mcp_tool_calls_total', {
    description: 'Total number of MCP tool calls initiated',
});
export const toolCallCompletionCounter = meter.createCounter('mcp_tool_call_completions_total', {
    description: 'Total number of MCP tool call completions',
});
export class MetricsRecorder {
    static recordConnection(url, operation, status) {
        connectionCounter.add(1, {
            'mcp.transport.url': url,
            'mcp.transport.operation': operation,
            'mcp.transport.status': status,
        });
    }
    static recordMessage(url, direction, method) {
        messageCounter.add(1, {
            'mcp.transport.url': url,
            'mcp.transport.direction': direction,
            'mcp.message.method': method,
        });
    }
    static recordMessageSize(size, direction, method) {
        messageSizeHistogram.record(size, {
            'mcp.transport.direction': direction,
            'mcp.message.method': method,
        });
    }
    static recordError(operation, errorType) {
        errorCounter.add(1, {
            'mcp.transport.operation': operation,
            'mcp.transport.error_type': errorType,
        });
    }
    static recordOperationDuration(duration, operation, status) {
        operationDurationHistogram.record(duration, {
            'mcp.transport.operation': operation,
            'mcp.transport.status': status,
        });
    }
    static recordSessionDuration(duration, url, sessionType) {
        sessionDurationHistogram.record(duration, {
            'mcp.transport.url': url,
            'mcp.transport.session_type': sessionType,
        });
    }
    static recordToolCall(url, method) {
        toolCallCounter.add(1, {
            'mcp.transport.url': url,
            'mcp.tool.method': method,
        });
    }
    static recordToolCallCompletion(url, method, reason) {
        toolCallCompletionCounter.add(1, {
            'mcp.transport.url': url,
            'mcp.tool.method': method,
            'mcp.tool.completion_reason': reason,
        });
    }
}
//# sourceMappingURL=otel-metrics.js.map