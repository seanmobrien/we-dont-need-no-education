import { SpanStatusCode } from '@opentelemetry/api';
import { tracer, MetricsRecorder, DEBUG_MODE, } from '../ai/mcp/instrumented-sse-transport/metrics/otel-metrics';
import { isError, LoggedError, log } from '@compliance-theater/logger';
import { withTimeoutAsError } from '@/lib/nextjs-util/with-timeout';
export const CONNECTION_TIMEOUT_MS = 30 * 1000;
export const SEND_TIMEOUT_MS = 5 * 60 * 1000;
export class SafetyUtils {
    #operationMetrics = new Map();
    #url;
    constructor(url) {
        this.#url = url;
    }
    createSafeErrorHandler(handler) {
        return (error) => {
            try {
                handler(error);
            }
            catch (wrapperError) {
                log((l) => l.error('Error handler failed', {
                    data: {
                        originalError: isError(error) ? error.message : String(error),
                        wrapperError: isError(wrapperError)
                            ? wrapperError.message
                            : String(wrapperError),
                    },
                }));
            }
        };
    }
    createSafeAsyncWrapper(operationName, fn, errorHandler) {
        return async (...args) => {
            const startTime = Date.now();
            let span;
            try {
                if (DEBUG_MODE) {
                    span = tracer.startSpan(`mcp.transport.${operationName}`, {
                        attributes: {
                            'mcp.transport.operation': operationName,
                            'mcp.transport.url': this.#url,
                        },
                    });
                }
                const result = await fn(...args);
                if (DEBUG_MODE) {
                    const duration = Date.now() - startTime;
                    MetricsRecorder.recordOperationDuration(duration, operationName, 'success');
                    span?.addEvent(`${operationName}.completed`, {
                        'mcp.transport.duration_ms': duration,
                    });
                    span?.setStatus({ code: SpanStatusCode.OK });
                }
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                MetricsRecorder.recordError(operationName, isError(error) ? error.name : 'unknown');
                MetricsRecorder.recordOperationDuration(duration, operationName, 'error');
                span?.recordException(error);
                span?.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: isError(error) ? error.message : String(error),
                });
                const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: false,
                    source: operationName,
                    include: { duration },
                });
                errorHandler(le);
                le.writeToLog({ source: operationName });
            }
            finally {
                span?.end();
            }
        };
    }
    recordOperation(operation, messageId) {
        const operationId = `${operation}-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        this.#operationMetrics.set(operationId, {
            startTime: Date.now(),
            operation,
            messageId,
        });
        return operationId;
    }
    completeOperation(operationId, status = 'success') {
        const metrics = this.#operationMetrics.get(operationId);
        if (metrics) {
            const duration = Date.now() - metrics.startTime;
            MetricsRecorder.recordOperationDuration(duration, metrics.operation, status);
            this.#operationMetrics.delete(operationId);
            if (DEBUG_MODE) {
                log((l) => l.debug(`Operation ${metrics.operation} completed`, {
                    data: { duration, status, messageId: metrics.messageId },
                }));
            }
        }
    }
    withTimeout(promise, timeoutMs, operation) {
        return withTimeoutAsError(promise, timeoutMs, operation);
    }
}
export const createSafeErrorHandler = (handler, url) => new SafetyUtils(url ?? 'url://null').createSafeErrorHandler(handler);
export const createSafeAsyncWrapper = (operationName, fn, errorHandler, url) => new SafetyUtils(url ?? 'url://null').createSafeAsyncWrapper(operationName, fn, errorHandler);
//# sourceMappingURL=safety-utils.js.map