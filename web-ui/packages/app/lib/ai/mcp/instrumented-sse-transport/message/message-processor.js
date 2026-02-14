import { MetricsRecorder, DEBUG_MODE } from '../metrics/otel-metrics';
import { log, LoggedError } from '@compliance-theater/logger';
export class MessageProcessor {
    #sessionManager;
    #counterManager;
    #url;
    constructor(url, sessionManager, counterManager) {
        this.#url = url;
        this.#sessionManager = sessionManager;
        this.#counterManager = counterManager;
    }
    processOutboundMessage(message) {
        const messageId = this.#sessionManager.getMessageId(message);
        const messageMethod = this.#sessionManager.getMessageMethod(message);
        const isToolCall = messageMethod && this.#sessionManager.isToolCallMethod(messageMethod);
        let sessionState = undefined;
        if (messageId) {
            sessionState = this.#sessionManager.getOrCreateSession(message);
            if (sessionState && sessionState.messageCount === 1) {
                this.#counterManager.incrementCounter('sessions');
            }
            if (sessionState && isToolCall && !sessionState.isToolCall) {
                sessionState.isToolCall = true;
                sessionState.toolCallMethod = messageMethod;
                this.#counterManager.incrementCounter('toolCalls');
                MetricsRecorder.recordToolCall(this.#url, messageMethod || 'unknown');
            }
        }
        MetricsRecorder.recordMessage(this.#url, 'outbound', messageMethod || 'unknown');
        const messageStr = JSON.stringify(message);
        const messageSize = new TextEncoder().encode(messageStr).length;
        MetricsRecorder.recordMessageSize(messageSize, 'outbound', messageMethod || 'unknown');
        if (DEBUG_MODE) {
            log((l) => l.debug('Processing outbound MCP message', {
                data: {
                    messageId,
                    method: messageMethod,
                    size: messageSize,
                    url: this.#url,
                    isToolCall,
                },
            }));
        }
    }
    processInboundMessage(message) {
        let sessionId = '';
        try {
            const messageId = this.#sessionManager.getMessageId(message);
            const messageMethod = this.#sessionManager.getMessageMethod(message);
            MetricsRecorder.recordMessage(this.#url, 'inbound', messageMethod || 'response');
            const messageStr = JSON.stringify(message);
            const messageSize = new TextEncoder().encode(messageStr).length;
            MetricsRecorder.recordMessageSize(messageSize, 'inbound', messageMethod || 'response');
            if (messageId) {
                sessionId = String(messageId);
                const sessionState = this.#sessionManager.getSession(sessionId);
                if (sessionState &&
                    sessionState.isToolCall &&
                    ('result' in message || 'error' in message)) {
                    const reason = 'error' in message ? 'error' : 'success';
                    this.#sessionManager.completeSession(sessionId, reason);
                    if (DEBUG_MODE) {
                        log((l) => l.debug('Tool call completed via response', {
                            data: {
                                sessionId,
                                success: reason === 'success',
                                method: sessionState.toolCallMethod,
                            },
                        }));
                    }
                }
            }
            if (DEBUG_MODE) {
                log((l) => l.debug('Processing inbound MCP message', {
                    data: {
                        messageId,
                        method: messageMethod,
                        size: messageSize,
                        isResponse: 'result' in message || 'error' in message,
                    },
                }));
            }
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'MessageProcessor',
                message: 'Failed to process inbound message',
                critical: true,
            });
            this.#sessionManager.completeSession(sessionId, 'error');
        }
    }
}
//# sourceMappingURL=message-processor.js.map