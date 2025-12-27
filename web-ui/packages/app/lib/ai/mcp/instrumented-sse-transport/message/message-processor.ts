/**
 * @fileoverview Message Processing Utilities for MCP Transport
 *
 * This module provides utilities for processing and handling MCP messages,
 * including message type detection and tool call identification.
 */

import type { JSONRPCMessage } from '../../ai.sdk';
import { SessionManager } from '../session/session-manager';
import { MetricsRecorder, DEBUG_MODE } from '../metrics/otel-metrics';
import { CounterManager } from '../metrics/counter-manager';
import { log } from '@compliance-theater/lib-logger';
import { LoggedError } from '@/lib/react-util';

/**
 * Handles message processing and tool call lifecycle management
 */
export class MessageProcessor {
  #sessionManager: SessionManager;
  #counterManager: CounterManager;
  #url: string;

  constructor(
    url: string,
    sessionManager: SessionManager,
    counterManager: CounterManager,
  ) {
    this.#url = url;
    this.#sessionManager = sessionManager;
    this.#counterManager = counterManager;
  }

  /**
   * Processes an outbound message and handles session/tool call tracking
   */
  processOutboundMessage(message: JSONRPCMessage): void {
    const messageId = this.#sessionManager.getMessageId(message);
    const messageMethod = this.#sessionManager.getMessageMethod(message);

    // Check if this is a tool call and track it
    const isToolCall =
      messageMethod && this.#sessionManager.isToolCallMethod(messageMethod);

    // Create or update session for this message if it has an ID
    let sessionState = undefined;
    if (messageId) {
      sessionState = this.#sessionManager.getOrCreateSession(message);

      // If this is a new session, increment session counter
      if (sessionState && sessionState.messageCount === 1) {
        this.#counterManager.incrementCounter('sessions');
      }

      // If this is a tool call and session wasn't already marked as tool call
      if (sessionState && isToolCall && !sessionState.isToolCall) {
        sessionState.isToolCall = true;
        sessionState.toolCallMethod = messageMethod;
        this.#counterManager.incrementCounter('toolCalls');

        MetricsRecorder.recordToolCall(this.#url, messageMethod || 'unknown');
      }
    }

    // Record message metrics
    MetricsRecorder.recordMessage(
      this.#url,
      'outbound',
      messageMethod || 'unknown',
    );

    // Record message size
    const messageStr = JSON.stringify(message);
    const messageSize = new TextEncoder().encode(messageStr).length;
    MetricsRecorder.recordMessageSize(
      messageSize,
      'outbound',
      messageMethod || 'unknown',
    );

    if (DEBUG_MODE) {
      log((l) =>
        l.debug('Processing outbound MCP message', {
          data: {
            messageId,
            method: messageMethod,
            size: messageSize,
            url: this.#url,
            isToolCall,
          },
        }),
      );
    }
  }

  /**
   * Processes an inbound message and handles response completion
   */
  processInboundMessage(message: JSONRPCMessage): void {
    let sessionId: string = '';
    try {
      const messageId = this.#sessionManager.getMessageId(message);
      const messageMethod = this.#sessionManager.getMessageMethod(message);

      // Record message metrics
      MetricsRecorder.recordMessage(
        this.#url,
        'inbound',
        messageMethod || 'response',
      );

      // Record message size
      const messageStr = JSON.stringify(message);
      const messageSize = new TextEncoder().encode(messageStr).length;
      MetricsRecorder.recordMessageSize(
        messageSize,
        'inbound',
        messageMethod || 'response',
      );

      // Check if this is a response to a tool call and handle completion
      if (messageId) {
        sessionId = String(messageId);
        const sessionState = this.#sessionManager.getSession(sessionId);

        // If this is a response (has result or error) and the session was a tool call
        if (
          sessionState &&
          sessionState.isToolCall &&
          ('result' in message || 'error' in message)
        ) {
          const reason = 'error' in message ? 'error' : 'success';
          this.#sessionManager.completeSession(sessionId, reason);

          if (DEBUG_MODE) {
            log((l) =>
              l.debug('Tool call completed via response', {
                data: {
                  sessionId,
                  success: reason === 'success',
                  method: sessionState.toolCallMethod,
                },
              }),
            );
          }
        }
      }

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Processing inbound MCP message', {
            data: {
              messageId,
              method: messageMethod,
              size: messageSize,
              isResponse: 'result' in message || 'error' in message,
            },
          }),
        );
      }
    } catch (error) {
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
