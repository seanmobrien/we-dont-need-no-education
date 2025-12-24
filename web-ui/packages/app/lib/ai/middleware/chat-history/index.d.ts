/**
 * @fileoverview Chat History Middleware for AI SDK.
 *
 * This module exports the main middleware factory and related utilities for
 * managing chat history persistence, state management, and tool optimization.
 */

import type {
  LanguageModelV2,
  LanguageModelV2Middleware,
} from '@ai-sdk/provider';
import type { ChatHistoryContext } from './types';

export type { ChatHistoryContext } from './types';
export {
  instrumentFlushOperation,
  instrumentStreamChunk,
  instrumentMiddlewareInit,
  recordQueueOperation,
  createChatHistoryError,
} from './instrumentation';
export {
  createAgentHistoryContext,
  createUserChatHistoryContext,
} from './create-chat-history-context';

declare module '@/lib/ai/middleware/chat-history' {
  /**
   * Creates a middleware for chat history management with State Management Support.
   *
   * This middleware supports the state management protocol and can participate
   * in state collection and restoration operations, preserving processing state
   * across operations.
   *
   * @param context - The chat history context containing persistence and logging utilities.
   * @returns {LanguageModelV2Middleware} A stateful middleware object that supports state serialization.
   */
  export const createChatHistoryMiddleware: (
    context: ChatHistoryContext,
  ) => LanguageModelV2Middleware;

  /**
   * Alias for the original chat history middleware factory (without state management wrapper).
   *
   * @param context - The chat history context.
   * @returns {LanguageModelV2Middleware} The middleware instance.
   */
  export const createChatHistoryMiddlewareEx: (
    context: ChatHistoryContext,
  ) => LanguageModelV2Middleware;

  /**
   * Wraps a language model with chat history and tool optimizing middleware.
   *
   * This utility function composes the chat history middleware with tool optimization
   * to provide a complete solution for chat persistence and efficiency.
   *
   * @param params - The parameters for wrapping the model.
   * @param params.model - The language model to wrap.
   * @param params.chatHistoryContext - The chat history context.
   * @returns {LanguageModelV2} The wrapped language model.
   * @throws {TypeError} If chatHistoryContext or model is missing.
   */
  export const wrapChatHistoryMiddleware: ({
    model,
    chatHistoryContext,
  }: {
    model: LanguageModelV2;
    chatHistoryContext: ChatHistoryContext;
  }) => LanguageModelV2;
}
