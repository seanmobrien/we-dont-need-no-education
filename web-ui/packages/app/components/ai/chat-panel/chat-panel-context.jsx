'use client';
import { createContext, useContext } from 'react';
export const ChatPanelContext = createContext(null);
export const useChatPanelContext = ({ required = true, } = {}) => {
    const context = useContext(ChatPanelContext);
    if (!context && required) {
        throw new Error('useChatPanelContext must be used within a ChatPanelProvider');
    }
    return context;
};
export { default as ChatPanelProvider } from './chat-panel-provider';
//# sourceMappingURL=chat-panel-context.jsx.map