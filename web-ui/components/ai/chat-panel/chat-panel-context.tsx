'use client';

import { createContext, useContext } from 'react';
import { ChatPanelContextValue } from './types';

/**
 * Create the context
 */
export const ChatPanelContext = createContext<ChatPanelContextValue | null>(
  null,
);

/**
 * Hook to use the chat panel context
 */
export const useChatPanelContext = ({
  required = true,
}: { required?: boolean } = {}): ChatPanelContextValue => {
  const context = useContext(ChatPanelContext);
  if (!context && required) {
    throw new Error(
      'useChatPanelContext must be used within a ChatPanelProvider',
    );
  }
  return context as unknown as ChatPanelContextValue;
};

export { default as ChatPanelProvider } from './chat-panel-provider';
