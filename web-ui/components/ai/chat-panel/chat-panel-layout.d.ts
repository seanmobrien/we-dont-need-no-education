/**
 * Type definitions for chat panel layout
 * @module components/ai/chat-panel/chat-panel-layout
 */

import React from 'react';

declare module '@/components/ai/chat-panel/chat-panel-layout' {
  /**
   * Props for the ChatPanelLayout component
   */
  export interface ChatPanelLayoutProps {
    children: React.ReactNode;
  }

  /**
   * Layout component that automatically adjusts spacing based on chat panel state
   */
  export const ChatPanelLayout: React.FC<ChatPanelLayoutProps>;
}
