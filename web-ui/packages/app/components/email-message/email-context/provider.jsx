'use client';
import React, { createContext, useContext, useState, useRef, useCallback, } from 'react';
import { useChatPanelContext } from '@/components/ai/chat-panel/chat-panel-context';
const EmailContextInstance = createContext(undefined);
export const EmailContextProvider = ({ children, emailId: emailIdFromState, }) => {
    const [emailId, setEmailIdState] = useState(emailIdFromState);
    const [isLoading, setIsLoading] = useState(false);
    const { setCaseFileId } = useChatPanelContext() ?? {
        setCaseFileId: () => { },
    };
    const setEmailId = useCallback((id) => {
        if (id === emailId) {
            return;
        }
        setEmailIdState(id);
        setCaseFileId(id);
    }, [emailId, setCaseFileId]);
    const contextValue = useRef({
        emailId,
        setEmailId,
        isLoading,
    });
    if (isLoading) {
        if (emailId) {
            setIsLoading(false);
        }
    }
    else {
        if (!emailId) {
            setIsLoading(true);
        }
    }
    contextValue.current = {
        emailId,
        setEmailId: (id) => setEmailId(id),
        isLoading,
    };
    return (<EmailContextInstance.Provider value={contextValue.current}>
      {children}
    </EmailContextInstance.Provider>);
};
export const useEmailContext = () => {
    const context = useContext(EmailContextInstance);
    if (!context) {
        throw new Error('useEmailContext must be used within an EmailProvider');
    }
    return context;
};
//# sourceMappingURL=provider.jsx.map