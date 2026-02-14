'use client';
import React from 'react';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { useChatPanelContext } from './chat-panel-context';
const LayoutContainer = styled(Box, {
    shouldForwardProp: (prop) => !['chatPanelPosition', 'chatPanelSize', 'isDashboardLayout'].includes(prop)
})(({ chatPanelPosition, chatPanelSize }) => {
    const baseStyles = {
        width: '100%',
        height: '100%',
        transition: 'all 0.3s ease-in-out',
    };
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
export const ChatPanelLayout = ({ children, }) => {
    const { config, setDockPanel } = useChatPanelContext();
    const isDocked = config.position !== 'inline' && config.position !== 'floating';
    const chatPanelSize = isDocked ? (config.dockSize || 300) : 0;
    return (<LayoutContainer ref={(node) => setDockPanel(node)} chatPanelPosition={config.position} chatPanelSize={chatPanelSize}>
      {children}
    </LayoutContainer>);
};
//# sourceMappingURL=chat-panel-layout.jsx.map