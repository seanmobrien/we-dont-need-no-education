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
export const useChatPanelContext = (): ChatPanelContextValue => {
  const context = useContext(ChatPanelContext);
  if (!context) {
    throw new Error(
      'useChatPanelContext must be used within a ChatPanelProvider',
    );
  }
  return context;
};

export { default as ChatPanelProvider } from './chat-panel-provider';
