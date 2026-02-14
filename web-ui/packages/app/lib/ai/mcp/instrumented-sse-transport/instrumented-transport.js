import { SpanStatusCode } from '@opentelemetry/api';
import { SseMCPTransport } from '../ai.sdk';
import { isError, isAbortError, LoggedError, log } from '@compliance-theater/logger';
import { tracer, MetricsRecorder, DEBUG_MODE } from './metrics/otel-metrics';
import { CounterManager } from './metrics/counter-manager';
import { SessionManager } from './session/session-manager';
import { TraceContextManager } from './tracing/trace-context';
import { SafetyUtils } from '../../../nextjs-util/safety-utils';
import { MessageProcessor } from './message/message-processor';
export class InstrumentedSseTransport extends SseMCPTransport {
    #counterManager;
    #sessionManager;
    #safetyUtils;
    #messageProcessor;
    #impersonation;
    #onmessage;
    #onerror;
    #onclose;
    #transportSpan;
    #connectionStartTime = 0;
    #isClosing = false;
    #heartbeatTimer;
    #inactivityTimer;
    #lastActivity = Date.now();
    #closed = false;
    #getHeaders;
    static HEARTBEAT_INTERVAL_MS = 15_000;
    static INACTIVITY_TIMEOUT_MS = 60_000 * 60 * 2;
    static POST_ERROR_AUTOCLOSE_DELAY_MS = 2_000;
    constructor({ headers: getHeaders, ...opts }) {
        let constructorSpan;
        try {
            constructorSpan = tracer.startSpan('mcp.transport.constructor', {
                attributes: {
                    'mcp.transport.url': opts.url,
                    'mcp.transport.mode': DEBUG_MODE ? 'DEBUG' : 'WARNING',
                    'mcp.transport.has_headers': !!getHeaders,
                },
            });
            if (DEBUG_MODE) {
                log((l) => l.debug('Initializing InstrumentedSseTransport', {
                    data: {
                        url: opts.url,
                        mode: DEBUG_MODE ? 'DEBUG' : 'WARNING',
                    },
                }));
            }
            const headers = TraceContextManager.injectTraceContext({});
            super({ ...opts, headers });
            this.#getHeaders = getHeaders || (() => Promise.resolve({}));
            if (!opts.onerror) {
                const error = new Error('onerror handler is required');
                constructorSpan?.recordException(error);
                constructorSpan?.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error.message,
                });
                throw error;
            }
            this.#safetyUtils = new SafetyUtils(opts.url);
            this.#counterManager = new CounterManager();
            this.#sessionManager = new SessionManager(opts.url, this.#counterManager);
            this.#messageProcessor = new MessageProcessor(opts.url, this.#sessionManager, this.#counterManager);
            this.#onclose = opts.onclose;
            this.#onmessage = opts.onmessage;
            this.#onerror = this.#safetyUtils.createSafeErrorHandler((e) => {
                opts.onerror(LoggedError.isTurtlesAllTheWayDownBaby(e, {
                    log: true,
                    message: 'MCP SSE Transport: Error occurred',
                }));
            });
            super.onclose = this.#safetyUtils.createSafeAsyncWrapper('handleClose', this.handleClose.bind(this), this.#onerror);
            super.onerror = this.#safetyUtils.createSafeAsyncWrapper('handleError', this.handleError.bind(this), this.#onerror);
            super.onmessage = this.#safetyUtils.createSafeAsyncWrapper('handleMessage', this.handleMessage.bind(this), this.#onerror);
            MetricsRecorder.recordConnection(opts.url, 'constructor', 'success');
            constructorSpan?.setStatus({ code: SpanStatusCode.OK });
            if (DEBUG_MODE) {
                log((l) => l.debug('InstrumentedSseTransport initialized successfully'));
            }
        }
        catch (error) {
            MetricsRecorder.recordConnection(opts.url, 'constructor', 'error');
            MetricsRecorder.recordError('constructor', isError(error) ? error.name : 'unknown');
            constructorSpan?.recordException(error);
            constructorSpan?.setStatus({
                code: SpanStatusCode.ERROR,
                message: isError(error) ? error.message : String(error),
            });
            log((l) => l.error('Failed to initialize InstrumentedSseTransport', {
                data: { error: isError(error) ? error.message : String(error) },
            }));
            throw error;
        }
        finally {
            constructorSpan?.end();
        }
    }
    get onmessage() {
        return this.#onmessage;
    }
    set onmessage(handler) {
        this.#onmessage = handler;
    }
    get onerror() {
        return this.#onerror;
    }
    set onerror(handler) {
        if (!handler) {
            throw new Error('onerror handler is required');
        }
        this.#onerror = this.#safetyUtils.createSafeErrorHandler(handler);
    }
    get onclose() {
        return this.#onclose;
    }
    set onclose(handler) {
        this.#onclose = handler;
    }
    toString() {
        return `InstrumentedSseTransport(${this.url?.toString() || 'unknown'})`;
    }
    async start() {
        let span;
        const operationId = this.#safetyUtils.recordOperation('start');
        try {
            this.#connectionStartTime = Date.now();
            span = tracer.startSpan('mcp.transport.start', {
                attributes: {
                    'mcp.transport.url': this.url?.toString(),
                    'mcp.transport.mode': DEBUG_MODE ? 'DEBUG' : 'WARNING',
                },
            });
            this.#transportSpan = span;
            if (DEBUG_MODE) {
                log((l) => l.debug('Starting MCP Client Transport', {
                    data: {
                        url: this.url?.toString(),
                        mode: DEBUG_MODE ? 'DEBUG' : 'WARNING',
                    },
                }));
            }
            MetricsRecorder.recordConnection(this.url?.toString() || 'unknown', 'start', 'attempt');
            await super.start();
            MetricsRecorder.recordConnection(this.url?.toString() || 'unknown', 'start', 'success');
            this.#initializeConnectionWatchdogs();
            span.setStatus({ code: SpanStatusCode.OK });
            this.#safetyUtils.completeOperation(operationId, 'success');
            if (DEBUG_MODE) {
                log((l) => l.debug('MCP Client Transport started successfully'));
            }
        }
        catch (error) {
            if (isAbortError(error)) {
                const isClosing = this.#isClosing;
                log((l) => l.verbose(`InstrumentedTransport::MCP Client Transport start() aborted; isClosing=${isClosing}`));
                return;
            }
            MetricsRecorder.recordConnection(this.url?.toString() || 'unknown', 'start', 'error');
            MetricsRecorder.recordError('start', isError(error) ? error.name : 'unknown');
            span?.recordException(error);
            span?.setStatus({
                code: SpanStatusCode.ERROR,
                message: isError(error) ? error.message : String(error),
            });
            this.#safetyUtils.completeOperation(operationId, 'error');
            log((l) => l.error('Failed to start MCP Client Transport', {
                data: {
                    error: isError(error) ? error.message : String(error),
                    stack: isError(error) ? error.stack : undefined,
                },
            }));
            throw error;
        }
        finally {
        }
    }
    async resolveHeaders() {
        const ret = await super.resolveHeaders();
        const dynamicHeaders = await this.#getHeaders();
        Object.entries(dynamicHeaders).forEach(([key, value]) => {
            ret.set(key, value);
        });
        if (this.#impersonation) {
            const token = await this.#impersonation.getImpersonatedToken();
            if (token) {
                ret.set('Authorization', `Bearer ${token}`);
            }
        }
        return ret;
    }
    async close() {
        let span;
        const operationId = this.#safetyUtils.recordOperation('close');
        try {
            this.#isClosing = true;
            span = tracer.startSpan('mcp.transport.close', {
                attributes: {
                    'mcp.transport.url': this.url?.toString(),
                    'mcp.transport.session_count': this.#sessionManager.sessionCount,
                },
            });
            if (DEBUG_MODE) {
                log((l) => l.debug('Closing MCP Client Transport', {
                    data: {
                        url: this.url?.toString(),
                        sessionCount: this.#sessionManager.sessionCount,
                        connectionDuration: this.#connectionStartTime
                            ? Date.now() - this.#connectionStartTime
                            : 0,
                    },
                }));
            }
            this.#sessionManager.closeAllSessions();
            this.#clearWatchdogs();
            try {
                await super.close();
            }
            catch (e) {
                if (isAbortError(e)) {
                    log((l) => l.verbose('InstrumentedSseTransport.close: Ignoring AbortError during close()'));
                }
                else {
                    throw e;
                }
            }
            if (this.#transportSpan) {
                try {
                    const connectionDuration = this.#connectionStartTime
                        ? Date.now() - this.#connectionStartTime
                        : 0;
                    this.#transportSpan.addEvent('transport.closed', {
                        'mcp.transport.duration_ms': connectionDuration,
                    });
                    this.#transportSpan.setStatus({ code: SpanStatusCode.OK });
                    this.#transportSpan.end();
                }
                catch (e) {
                    LoggedError.isTurtlesAllTheWayDownBaby(e, {
                        log: true,
                    });
                }
            }
            span.setStatus({ code: SpanStatusCode.OK });
            this.#safetyUtils.completeOperation(operationId, 'success');
            this.#closed = true;
            if (DEBUG_MODE) {
                log((l) => l.debug('MCP Client Transport closed successfully'));
            }
        }
        catch (error) {
            MetricsRecorder.recordError('close', isError(error) ? error.name : 'unknown');
            span?.recordException(error);
            span?.setStatus({
                code: SpanStatusCode.ERROR,
                message: isError(error) ? error.message : String(error),
            });
            this.#safetyUtils.completeOperation(operationId, 'error');
            log((l) => l.error('Failed to close MCP Client Transport', {
                data: { error: isError(error) ? error.message : String(error) },
            }));
        }
        finally {
            span?.end();
        }
    }
    async send(message) {
        let span;
        const messageId = this.#sessionManager.getMessageId(message);
        const messageMethod = this.#sessionManager.getMessageMethod(message);
        const operationId = this.#safetyUtils.recordOperation('send', messageId);
        try {
            span = tracer.startSpan('mcp.transport.send', {
                attributes: {
                    'mcp.transport.url': this.url?.toString(),
                    'mcp.message.id': String(messageId || 'unknown'),
                    'mcp.message.method': messageMethod || 'unknown',
                },
            });
            this.#messageProcessor.processOutboundMessage(message);
            if (DEBUG_MODE) {
                log((l) => l.debug('Sending MCP Client Message', {
                    data: {
                        messageId,
                        method: messageMethod,
                        url: this.url?.toString(),
                    },
                }));
            }
            await super.send(message);
            span.setStatus({ code: SpanStatusCode.OK });
            this.#safetyUtils.completeOperation(operationId, 'success');
            if (DEBUG_MODE) {
                log((l) => l.debug('MCP Client Message sent successfully', {
                    data: { messageId, method: messageMethod },
                }));
            }
        }
        catch (error) {
            MetricsRecorder.recordError('send', isError(error) ? error.name : 'unknown');
            span?.recordException(error);
            span?.setStatus({
                code: SpanStatusCode.ERROR,
                message: isError(error) ? error.message : String(error),
            });
            this.#safetyUtils.completeOperation(operationId, 'error');
            log((l) => l.error('Failed to send MCP Client Message', {
                data: {
                    messageId,
                    method: messageMethod,
                    error: isError(error) ? error.message : String(error),
                },
            }));
            throw error;
        }
        finally {
            span?.end();
        }
    }
    getActiveCounters() {
        return this.#counterManager.getActiveCounters();
    }
    resetActiveCounters() {
        this.#counterManager.resetActiveCounters();
    }
    getSessionDebugInfo() {
        return this.#sessionManager.getSessionDebugInfo();
    }
    forceCompleteToolCall(sessionId, reason = 'manual_completion') {
        return this.#sessionManager.forceCompleteToolCall(sessionId, reason);
    }
    getEnhancedHeaders(baseHeaders = {}) {
        return TraceContextManager.getEnhancedHeaders(baseHeaders);
    }
    updateHeadersWithTraceContext(headers) {
        return TraceContextManager.updateHeadersWithTraceContext(headers);
    }
    static injectTraceContext(headers = {}) {
        return TraceContextManager.injectTraceContext(headers);
    }
    handleClose() {
        log((l) => l.verbose('MCP Client Transport Closed'));
        try {
            this.#onclose?.();
        }
        catch (e) {
            log((l) => l.error('Error handling MCP Client Transport close:', e));
        }
    }
    handleMessage(message) {
        log((l) => l.verbose('MCP Client Transport Message Received:', message));
        try {
            this.#messageProcessor.processInboundMessage(message);
            this.#lastActivity = Date.now();
            this.#onmessage?.(message);
        }
        catch (e) {
            log((l) => l.error('Error handling MCP Client Transport message:', e));
        }
    }
    handleError(error) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'MCP Client Transport',
            data: {
                details: 'Error occurred in MCP Client Transport',
            },
        });
        try {
            this.#onerror(le);
        }
        catch (e) {
            log((l) => l.error('Error handling MCP Client Transport error:', e));
        }
        if (!this.#isClosing && !isAbortError(error)) {
            this.#schedulePostErrorAutoclose();
        }
    }
    #initializeConnectionWatchdogs() {
        this.#lastActivity = Date.now();
        this.#clearWatchdogs();
        this.#heartbeatTimer = setInterval(() => {
            if (this.#isClosing || this.#closed)
                return;
            const now = Date.now();
            MetricsRecorder.recordConnection(this.url?.toString() || 'unknown', 'heartbeat', 'success');
            if (now - this.#lastActivity >
                InstrumentedSseTransport.INACTIVITY_TIMEOUT_MS) {
                log((l) => l.warn('MCP Client Transport inactivity threshold exceeded; initiating graceful close', {
                    url: this.url?.toString(),
                    idleMs: now - this.#lastActivity,
                    threshold: InstrumentedSseTransport.INACTIVITY_TIMEOUT_MS,
                }));
                this.close().catch((err) => log((l) => l.error('Error while closing after inactivity watchdog', {
                    error: isError(err) ? err.message : String(err),
                })));
            }
        }, InstrumentedSseTransport.HEARTBEAT_INTERVAL_MS);
    }
    #clearWatchdogs() {
        if (this.#heartbeatTimer) {
            clearInterval(this.#heartbeatTimer);
            this.#heartbeatTimer = undefined;
        }
        if (this.#inactivityTimer) {
            clearTimeout(this.#inactivityTimer);
            this.#inactivityTimer = undefined;
        }
    }
    #schedulePostErrorAutoclose() {
        if (this.#inactivityTimer || this.#isClosing || this.#closed)
            return;
        this.#inactivityTimer = setTimeout(() => {
            if (this.#isClosing || this.#closed)
                return;
            log((l) => l.warn('Auto-closing MCP Client Transport after error grace period', {
                url: this.url?.toString(),
                delayMs: InstrumentedSseTransport.POST_ERROR_AUTOCLOSE_DELAY_MS,
            }));
            this.close().catch((err) => log((l) => l.error('Error during post-error autoclose', {
                error: isError(err) ? err.message : String(err),
            })));
        }, InstrumentedSseTransport.POST_ERROR_AUTOCLOSE_DELAY_MS);
    }
}
//# sourceMappingURL=instrumented-transport.js.map