'use client';

import React from 'react';
import { Box, styled } from '@mui/material';
import { useChatPanelContext } from './chat-panel-context';

/**
 * Props for the ChatPanelLayout component
 */
export interface ChatPanelLayoutProps {
  children: React.ReactNode;
}

/**
 * Styled component that adjusts layout based on chat panel state
 */
const LayoutContainer = styled(Box, {
  shouldForwardProp: (prop) => !['chatPanelPosition', 'chatPanelSize', 'isDashboardLayout'].includes(prop as string)
})<{ 
  chatPanelPosition: string;
  chatPanelSize: number;
}>(({ chatPanelPosition, chatPanelSize }) => {
  const baseStyles = {
    width: '100%',
    height: '100%',
    transition: 'all 0.3s ease-in-out',
  };



  // For regular layouts, adjust viewport-wide
  switch (chatPanelPosition) {
    case 'left':
      return {
        ...baseStyles,
        paddingLeft: `${chatPanelSize}px`,
      };
    case 'right':
      return {
        ...baseStyles,
        paddingRight: `${chatPanelSize}px`,
      };
    case 'top':
      return {
        ...baseStyles,
        paddingTop: `${chatPanelSize}px`,
      };
    case 'bottom':
      return {
        ...baseStyles,
        paddingBottom: `${chatPanelSize}px`,
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
}) => {
  
  const { config, setDockPanel } = useChatPanelContext();
  
  // Only apply spacing adjustments for docked positions
  const isDocked = config.position !== 'inline' && config.position !== 'floating';
  const chatPanelSize = isDocked ? (config.dockSize || 300) : 0;

  return (
    <LayoutContainer      
      ref={(node) => setDockPanel(node as HTMLDivElement)}
      chatPanelPosition={config.position}
      chatPanelSize={chatPanelSize}
    >
      {children}
    </LayoutContainer>
  );
};
