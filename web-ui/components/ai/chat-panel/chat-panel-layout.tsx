'use client';

import React from 'react';
import { Box, styled } from '@mui/material';
import { useChatPanelContext } from './chat-panel-context';

/**
 * Props for the ChatPanelLayout component
 */
export interface ChatPanelLayoutProps {
  children: React.ReactNode;
  isDashboardLayout?: boolean;
}

/**
 * Styled component that adjusts layout based on chat panel state
 */
const LayoutContainer = styled(Box, {
  shouldForwardProp: (prop) => !['chatPanelPosition', 'chatPanelSize', 'isDashboardLayout'].includes(prop as string)
})<{ 
  chatPanelPosition: string;
  chatPanelSize: number;
  isDashboardLayout: boolean;
}>(({ chatPanelPosition, chatPanelSize, isDashboardLayout }) => {
  const baseStyles = {
    width: '100%',
    height: '100%',
    transition: 'all 0.3s ease-in-out',
  };

  // For dashboard layouts, adjust container width/height directly
  if (isDashboardLayout) {
    switch (chatPanelPosition) {
      case 'left':
        return {
          ...baseStyles,
          width: `calc(100% - ${chatPanelSize}px)`,
          marginLeft: `${chatPanelSize}px`,
        };
      case 'right':
        return {
          ...baseStyles,
          width: `calc(100% - ${chatPanelSize}px)`,
          marginRight: `${chatPanelSize}px`,
        };
      case 'top':
        return {
          ...baseStyles,
          height: `calc(100% - ${chatPanelSize}px)`,
          marginTop: `${chatPanelSize}px`,
        };
      case 'bottom':
        return {
          ...baseStyles,
          height: `calc(100% - ${chatPanelSize}px)`,
          marginBottom: `${chatPanelSize}px`,
        };
      default:
        return baseStyles;
    }
  }

  // For regular layouts, use viewport-based adjustments
  switch (chatPanelPosition) {
    case 'left':
      return {
        ...baseStyles,
        width: `calc(100vw - ${chatPanelSize}px)`,
        marginLeft: `${chatPanelSize}px`,
      };
    case 'right':
      return {
        ...baseStyles,
        width: `calc(100vw - ${chatPanelSize}px)`,
        marginRight: `${chatPanelSize}px`,
      };
    case 'top':
      return {
        ...baseStyles,
        height: `calc(100vh - ${chatPanelSize}px)`,
        marginTop: `${chatPanelSize}px`,
      };
    case 'bottom':
      return {
        ...baseStyles,
        height: `calc(100vh - ${chatPanelSize}px)`,
        marginBottom: `${chatPanelSize}px`,
      };
    default:
      return baseStyles;
  }
});

/**
 * Layout component that automatically adjusts spacing based on chat panel state
 */
export const ChatPanelLayout: React.FC<ChatPanelLayoutProps> = ({ 
  children, 
  isDashboardLayout = false 
}) => {
  const { config } = useChatPanelContext();
  
  // Only apply spacing adjustments for docked positions
  const isDocked = config.position !== 'inline' && config.position !== 'floating';
  const chatPanelSize = isDocked ? (config.dockSize || 300) : 0;

  return (
    <LayoutContainer
      chatPanelPosition={config.position}
      chatPanelSize={chatPanelSize}
      isDashboardLayout={isDashboardLayout}
    >
      {children}
    </LayoutContainer>
  );
};