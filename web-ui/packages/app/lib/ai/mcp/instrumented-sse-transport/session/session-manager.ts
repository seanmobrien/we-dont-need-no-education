/**
 * @fileoverview Session Management for MCP Transport
 *
 * This module handles session lifecycle, idle timeouts, and session state tracking.
 */

import { Span, SpanStatusCode } from '@opentelemetry/api';
import { tracer, MetricsRecorder, DEBUG_MODE } from '../metrics/otel-metrics';
import { CounterManager } from '../metrics/counter-manager';
import type { JSONRPCMessage } from '@/lib/ai/mcp/ai.sdk';
import { log } from '@compliance-theater/logger';
import { isError } from '@/lib/react-util/utility-methods';

export interface SpanState {
  span: Span;
  idleTimer: ReturnType<typeof setTimeout>;
  createdAt: number;
  messageCount: number;
  lastActivity: number;
  isToolCall?: boolean;
  toolCallMethod?: string;
}

// Constants
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

// Tool call methods that initiate sessions
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

/**
 * Manages MCP session lifecycle and tracking
 */
export class SessionManager {
  #sessions = new Map<string, SpanState>();
  #counterManager: CounterManager;
  #url: string;
  #isClosing = false;

  constructor(url: string, counterManager: CounterManager) {
    this.#url = url;
    this.#counterManager = counterManager;
  }

  /**
   * Creates or updates session state for message tracking
   */
  getOrCreateSession(message: JSONRPCMessage): SpanState | undefined {
    const messageId = this.getMessageId(message);
    if (!messageId) return undefined;

    const sessionId = String(messageId);
    let sessionState = this.#sessions.get(sessionId);

    if (!sessionState) {
      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Creating new MCP session', {
            data: { sessionId, method: this.getMessageMethod(message) },
          })
        );
      }

      // Create session span as child of current active span
      const span = tracer.startSpan('mcp.session', {
        attributes: {
          'mcp.session.id': sessionId,
          'mcp.session.created_at': Date.now(),
          'mcp.transport.url': this.#url,
          'mcp.session.initiating_method':
            this.getMessageMethod(message) || 'unknown',
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

    // Update activity
    sessionState.messageCount++;
    sessionState.lastActivity = Date.now();
    clearTimeout(sessionState.idleTimer);
    sessionState.idleTimer = this.setIdleTimer(sessionId);

    return sessionState;
  }

  /**
   * Checks if a message method is a tool call
   */
  isToolCallMethod(method: string): boolean {
    return TOOL_CALL_METHODS.has(method);
  }

  /**
   * Sets up idle timer for session cleanup
   */
  setIdleTimer(sessionId: string): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      try {
        const sessionState = this.#sessions.get(sessionId);
        if (sessionState && !this.#isClosing) {
          const sessionDuration = Date.now() - sessionState.createdAt;

          MetricsRecorder.recordSessionDuration(
            sessionDuration,
            this.#url,
            'idle_timeout'
          );

          sessionState.span.addEvent('session.idle_timeout', {
            'mcp.session.duration_ms': sessionDuration,
            'mcp.session.message_count': sessionState.messageCount,
          });
          sessionState.span.setStatus({ code: SpanStatusCode.OK });
          sessionState.span.end();

          // Decrement counters before removing session
          this.#counterManager.decrementCounter('sessions');
          if (sessionState.isToolCall) {
            this.#counterManager.decrementCounter('toolCalls');

            // Record tool call completion
            MetricsRecorder.recordToolCallCompletion(
              this.#url,
              sessionState.toolCallMethod || 'unknown',
              'idle_timeout'
            );
          }

          this.#sessions.delete(sessionId);

          if (DEBUG_MODE) {
            log((l) =>
              l.debug('Session idle timeout', {
                data: {
                  sessionId,
                  duration: sessionDuration,
                  messageCount: sessionState.messageCount,
                },
              })
            );
          }
        }
      } catch (error) {
        log((l) =>
          l.error('Error in session idle timer', {
            data: {
              sessionId,
              error: isError(error) ? error.message : String(error),
            },
          })
        );
      }
    }, IDLE_TIMEOUT_MS);
  }

  /**
   * Gets session by ID
   */
  getSession(sessionId: string): SpanState | undefined {
    return this.#sessions.get(sessionId);
  }

  /**
   * Closes all active sessions
   */
  closeAllSessions(): void {
    this.#isClosing = true;

    for (const [, sessionState] of this.#sessions.entries()) {
      const sessionDuration = Date.now() - sessionState.createdAt;

      MetricsRecorder.recordSessionDuration(
        sessionDuration,
        this.#url,
        'normal_close'
      );

      sessionState.span.addEvent('session.closing', {
        'mcp.session.duration_ms': sessionDuration,
        'mcp.session.message_count': sessionState.messageCount,
      });
      sessionState.span.setStatus({ code: SpanStatusCode.OK });
      sessionState.span.end();
      clearTimeout(sessionState.idleTimer);

      // Decrement counters safely
      this.#counterManager.decrementCounter('sessions');
      if (sessionState.isToolCall) {
        this.#counterManager.decrementCounter('toolCalls');

        // Record tool call completion
        MetricsRecorder.recordToolCallCompletion(
          this.#url,
          sessionState.toolCallMethod || 'unknown',
          'transport_close'
        );
      }
    }
    this.#sessions.clear();
  }

  /**
   * Completes a specific session
   */
  completeSession(sessionId: string, reason: string = 'completed'): boolean {
    const sessionState = this.#sessions.get(sessionId);
    if (!sessionState) return false;

    const sessionDuration = Date.now() - sessionState.createdAt;

    MetricsRecorder.recordSessionDuration(
      sessionDuration,
      this.#url,
      reason === 'tool_call_response'
        ? 'tool_call_response'
        : 'normal_completion'
    );

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

    // Decrement counters
    this.#counterManager.decrementCounter('sessions');
    if (sessionState.isToolCall) {
      this.#counterManager.decrementCounter('toolCalls');

      // Record tool call completion
      MetricsRecorder.recordToolCallCompletion(
        this.#url,
        sessionState.toolCallMethod || 'unknown',
        reason
      );
    }

    this.#sessions.delete(sessionId);
    return true;
  }

  /**
   * Gets current session information for debugging
   */
  getSessionDebugInfo(): Array<{
    sessionId: string;
    messageCount: number;
    duration: number;
    isToolCall: boolean;
    toolCallMethod?: string;
    lastActivity: number;
  }> {
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

  /**
   * Manually completes a stuck tool call session
   */
  forceCompleteToolCall(
    sessionId: string,
    reason: string = 'manual_completion'
  ): boolean {
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

    // Decrement counters
    this.#counterManager.decrementCounter('sessions');
    this.#counterManager.decrementCounter('toolCalls');

    // Record tool call completion
    MetricsRecorder.recordToolCallCompletion(
      this.#url,
      sessionState.toolCallMethod || 'unknown',
      reason
    );

    this.#sessions.delete(sessionId);

    log((l) =>
      l.warn('Tool call manually completed', {
        data: {
          sessionId,
          duration: sessionDuration,
          reason,
          method: sessionState.toolCallMethod,
        },
      })
    );

    return true;
  }

  get sessionCount(): number {
    return this.#sessions.size;
  }

  // Message utility methods
  getMessageId(message: JSONRPCMessage): string | number | undefined {
    return this.hasId(message) ? message.id : undefined;
  }

  getMessageMethod(message: JSONRPCMessage): string | undefined {
    return this.hasMethod(message) ? message.method : undefined;
  }

  private hasId(
    message: JSONRPCMessage
  ): message is JSONRPCMessage & { id: string | number } {
    return 'id' in message && message.id !== undefined;
  }

  private hasMethod(
    message: JSONRPCMessage
  ): message is JSONRPCMessage & { method: string } {
    return 'method' in message && typeof message.method === 'string';
  }
}
