import { trace } from '@opentelemetry/api';
import { log } from '@compliance-theater/logger';
import { DEBUG_MODE } from '../metrics/otel-metrics';
export class TraceContextManager {
    static injectTraceContext(headers = {}) {
        const activeSpan = trace.getActiveSpan();
        if (activeSpan) {
            const spanContext = activeSpan.spanContext();
            if (spanContext.traceId && spanContext.spanId) {
                headers['traceparent'] = `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags?.toString(16).padStart(2, '0') || '01'}`;
                if (DEBUG_MODE) {
                    log((l) => l.debug('Injected trace context into headers (static)', {
                        data: {
                            traceId: spanContext.traceId,
                            spanId: spanContext.spanId,
                            traceFlags: spanContext.traceFlags,
                        },
                    }));
                }
            }
        }
        return headers;
    }
    static getEnhancedHeaders(baseHeaders = {}) {
        return TraceContextManager.injectTraceContext(baseHeaders);
    }
    static updateHeadersWithTraceContext(headers) {
        const originalKeyCount = Object.keys(headers).length;
        const enhancedHeaders = TraceContextManager.injectTraceContext(headers);
        Object.assign(headers, enhancedHeaders);
        const wasInjected = Object.keys(headers).length > originalKeyCount;
        if (wasInjected && DEBUG_MODE) {
            log((l) => l.debug('Trace context updated in existing headers', {
                data: {
                    originalKeys: originalKeyCount,
                    newKeys: Object.keys(headers).length,
                },
            }));
        }
        return wasInjected;
    }
}
//# sourceMappingURL=trace-context.js.map