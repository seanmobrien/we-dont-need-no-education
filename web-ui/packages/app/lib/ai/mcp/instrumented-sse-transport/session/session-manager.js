import { SpanStatusCode } from '@opentelemetry/api';
import { tracer, MetricsRecorder, DEBUG_MODE } from '../metrics/otel-metrics';
import { log, isError } from '@compliance-theater/logger';
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const TOOL_CALL_METHODS = new Set([
    'tools/call',
    'tools/list',
    'tools/get',
    'prompts/list',
    'prompts/get',
    'resources/list',
    'resources/read',
    'resources/subscribe',
]);
export class SessionManager {
    #sessions = new Map();
    #counterManager;
    #url;
    #isClosing = false;
    constructor(url, counterManager) {
        this.#url = url;
        this.#counterManager = counterManager;
    }
    getOrCreateSession(message) {
        const messageId = this.getMessageId(message);
        if (!messageId)
            return undefined;
        const sessionId = String(messageId);
        let sessionState = this.#sessions.get(sessionId);
        if (!sessionState) {
            if (DEBUG_MODE) {
                log((l) => l.debug('Creating new MCP session', {
                    data: { sessionId, method: this.getMessageMethod(message) },
                }));
            }
            const span = tracer.startSpan('mcp.session', {
                attributes: {
                    'mcp.session.id': sessionId,
                    'mcp.session.created_at': Date.now(),
                    'mcp.transport.url': this.#url,
                    'mcp.session.initiating_method': this.getMessageMethod(message) || 'unknown',
                },
            });
            sessionState = {
                span,
                idleTimer: this.setIdleTimer(sessionId),
                createdAt: Date.now(),
                messageCount: 0,
                lastActivity: Date.now(),
            };
            this.#sessions.set(sessionId, sessionState);
        }
        sessionState.messageCount++;
        sessionState.lastActivity = Date.now();
        clearTimeout(sessionState.idleTimer);
        sessionState.idleTimer = this.setIdleTimer(sessionId);
        return sessionState;
    }
    isToolCallMethod(method) {
        return TOOL_CALL_METHODS.has(method);
    }
    setIdleTimer(sessionId) {
        return setTimeout(() => {
            try {
                const sessionState = this.#sessions.get(sessionId);
                if (sessionState && !this.#isClosing) {
                    const sessionDuration = Date.now() - sessionState.createdAt;
                    MetricsRecorder.recordSessionDuration(sessionDuration, this.#url, 'idle_timeout');
                    sessionState.span.addEvent('session.idle_timeout', {
                        'mcp.session.duration_ms': sessionDuration,
                        'mcp.session.message_count': sessionState.messageCount,
                    });
                    sessionState.span.setStatus({ code: SpanStatusCode.OK });
                    sessionState.span.end();
                    this.#counterManager.decrementCounter('sessions');
                    if (sessionState.isToolCall) {
                        this.#counterManager.decrementCounter('toolCalls');
                        MetricsRecorder.recordToolCallCompletion(this.#url, sessionState.toolCallMethod || 'unknown', 'idle_timeout');
                    }
                    this.#sessions.delete(sessionId);
                    if (DEBUG_MODE) {
                        log((l) => l.debug('Session idle timeout', {
                            data: {
                                sessionId,
                                duration: sessionDuration,
                                messageCount: sessionState.messageCount,
                            },
                        }));
                    }
                }
            }
            catch (error) {
                log((l) => l.error('Error in session idle timer', {
                    data: {
                        sessionId,
                        error: isError(error) ? error.message : String(error),
                    },
                }));
            }
        }, IDLE_TIMEOUT_MS);
    }
    getSession(sessionId) {
        return this.#sessions.get(sessionId);
    }
    closeAllSessions() {
        this.#isClosing = true;
        for (const [, sessionState] of this.#sessions.entries()) {
            const sessionDuration = Date.now() - sessionState.createdAt;
            MetricsRecorder.recordSessionDuration(sessionDuration, this.#url, 'normal_close');
            sessionState.span.addEvent('session.closing', {
                'mcp.session.duration_ms': sessionDuration,
                'mcp.session.message_count': sessionState.messageCount,
            });
            sessionState.span.setStatus({ code: SpanStatusCode.OK });
            sessionState.span.end();
            clearTimeout(sessionState.idleTimer);
            this.#counterManager.decrementCounter('sessions');
            if (sessionState.isToolCall) {
                this.#counterManager.decrementCounter('toolCalls');
                MetricsRecorder.recordToolCallCompletion(this.#url, sessionState.toolCallMethod || 'unknown', 'transport_close');
            }
        }
        this.#sessions.clear();
    }
    completeSession(sessionId, reason = 'completed') {
        const sessionState = this.#sessions.get(sessionId);
        if (!sessionState)
            return false;
        const sessionDuration = Date.now() - sessionState.createdAt;
        MetricsRecorder.recordSessionDuration(sessionDuration, this.#url, reason === 'tool_call_response'
            ? 'tool_call_response'
            : 'normal_completion');
        if (sessionState.isToolCall) {
            sessionState.span.addEvent('tool.call.completed', {
                'mcp.session.duration_ms': sessionDuration,
                'mcp.session.message_count': sessionState.messageCount,
                'mcp.tool.success': reason !== 'error',
            });
        }
        sessionState.span.setStatus({ code: SpanStatusCode.OK });
        sessionState.span.end();
        clearTimeout(sessionState.idleTimer);
        this.#counterManager.decrementCounter('sessions');
        if (sessionState.isToolCall) {
            this.#counterManager.decrementCounter('toolCalls');
            MetricsRecorder.recordToolCallCompletion(this.#url, sessionState.toolCallMethod || 'unknown', reason);
        }
        this.#sessions.delete(sessionId);
        return true;
    }
    getSessionDebugInfo() {
        const now = Date.now();
        return Array.from(this.#sessions.entries()).map(([sessionId, state]) => ({
            sessionId,
            messageCount: state.messageCount,
            duration: now - state.createdAt,
            isToolCall: !!state.isToolCall,
            toolCallMethod: state.toolCallMethod,
            lastActivity: now - state.lastActivity,
        }));
    }
    forceCompleteToolCall(sessionId, reason = 'manual_completion') {
        const sessionState = this.#sessions.get(sessionId);
        if (!sessionState || !sessionState.isToolCall) {
            return false;
        }
        const sessionDuration = Date.now() - sessionState.createdAt;
        sessionState.span.addEvent('tool.call.force_completed', {
            'mcp.session.duration_ms': sessionDuration,
            'mcp.session.message_count': sessionState.messageCount,
            'mcp.tool.completion_reason': reason,
        });
        sessionState.span.setStatus({ code: SpanStatusCode.OK });
        sessionState.span.end();
        clearTimeout(sessionState.idleTimer);
        this.#counterManager.decrementCounter('sessions');
        this.#counterManager.decrementCounter('toolCalls');
        MetricsRecorder.recordToolCallCompletion(this.#url, sessionState.toolCallMethod || 'unknown', reason);
        this.#sessions.delete(sessionId);
        log((l) => l.warn('Tool call manually completed', {
            data: {
                sessionId,
                duration: sessionDuration,
                reason,
                method: sessionState.toolCallMethod,
            },
        }));
        return true;
    }
    get sessionCount() {
        return this.#sessions.size;
    }
    getMessageId(message) {
        return this.hasId(message) ? message.id : undefined;
    }
    getMessageMethod(message) {
        return this.hasMethod(message) ? message.method : undefined;
    }
    hasId(message) {
        return 'id' in message && message.id !== undefined;
    }
    hasMethod(message) {
        return 'method' in message && typeof message.method === 'string';
    }
}
//# sourceMappingURL=session-manager.js.map