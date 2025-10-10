'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import { EmailContext } from './types';
import { useChatPanelContext } from '@/components/ai/chat-panel/chat-panel-context';

const EmailContextInstance = createContext<EmailContext | undefined>(undefined);

export const EmailContextProvider = ({
  children,
  emailId: emailIdFromState,
}: {
  children: ReactNode;
  emailId?: string;
}) => {
  const [emailId, setEmailIdState] = useState<string | undefined>(
    emailIdFromState,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { setCaseFileId } = useChatPanelContext() ?? {
    setCaseFileId: () => {},
  };

  const setEmailId = useCallback(
    (id: string) => {
      if (id === emailId) {
        return;
      }
      setEmailIdState(id);
      setCaseFileId(id);
    },
    [emailId, setCaseFileId],
  );
  const contextValue = useRef<EmailContext>({
    emailId,
    setEmailId,
    isLoading,
  });

  if (isLoading) {
    if (emailId) {
      setIsLoading(false);
    }
  } else {
    if (!emailId) {
      setIsLoading(true);
    }
  }

  contextValue.current = {
    emailId,
    setEmailId: (id: string) => setEmailId(id),
    isLoading,
  };
  return (
    <EmailContextInstance.Provider value={contextValue.current}>
      {children}
    </EmailContextInstance.Provider>
  );
};

export const useEmailContext = () => {
  const context = useContext(EmailContextInstance);
  if (!context) {
    throw new Error('useEmailContext must be used within an EmailProvider');
  }
  return context;
};
