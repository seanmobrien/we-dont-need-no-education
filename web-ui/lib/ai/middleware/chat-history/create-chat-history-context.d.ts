/**
 * @fileoverview Functions for creating chat history contexts.
 * Includes context creation for both user and agent interactions.
 */

import type { ChatHistoryContext } from './types';

declare module '@/lib/ai/middleware/chat-history/create-chat-history-context' {
  /**
   * Constant representing the user ID for the AI agent.
   */
  export const AgentUserId = -1;

  /**
   * Properties for creating an agent history context.
   */
  type CreateAgentHistoryContextProps = Omit<
    ChatHistoryContext,
    | 'span'
    | 'error'
    | 'dispose'
    | 'userId'
    | 'requestId'
    | 'beganAt'
    | 'iteration'
    | 'temperature'
    | 'topP'
  > & {
    iteration?: number;
    operation: string;
    originatingUserId: string;
    opTags?: Record<string, unknown>;
  };

  /**
   * Creates a chat history context for an agent operation.
   * Initializes tracing and sets up the context with agent-specific defaults.
   *
   * @param props - The properties for creating the context.
   * @returns {ChatHistoryContext} The initialized chat history context.
   */
  export const createAgentHistoryContext: (
    props: CreateAgentHistoryContextProps,
  ) => ChatHistoryContext;

  /**
   * Creates a chat history context for a user interaction.
   * Initializes tracing and sets up the context with user-specific details.
   *
   * @param props - The properties for creating the context.
   * @param props.userId - The ID of the user.
   * @param props.requestId - Optional request ID.
   * @param props.chatId - Optional chat ID.
   * @param props.turnId - Optional turn ID.
   * @param props.model - Optional model name.
   * @returns {ChatHistoryContext} The initialized chat history context.
   */
  export const createUserChatHistoryContext: (props: {
    userId: string;
    requestId?: string;
    chatId?: string;
    turnId?: string;
    model?: string;
  }) => ChatHistoryContext;
}
