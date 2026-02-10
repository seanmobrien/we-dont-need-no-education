/**
 * Type definitions for chat panel context
 * @module components/ai/chat-panel/chat-panel-context
 */
import { createContext } from 'react';
import { ChatPanelContextValue } from './types';
import { ChatPanelProvider } from './chat-panel-provider';
declare module '@/components/ai/chat-panel/chat-panel-context' {
  /**
   * Create the context
   */
  export const ChatPanelContext: ReturnType<
    typeof createContext<ChatPanelContextValue | null>
  >;

  /**
   * Hook to use the chat panel context
   */
  export function useChatPanelContext(options?: {
    required?: boolean;
  }): ChatPanelContextValue;

  export { ChatPanelProvider as default };
}
