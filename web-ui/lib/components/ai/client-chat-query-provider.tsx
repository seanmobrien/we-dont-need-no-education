'use client';

import React from 'react';
import { ChatQueryProvider } from '@/lib/components/ai/chat-query-provider';

interface ClientQueryProviderProps {
  children: React.ReactNode;
}

/**
 * Client-side wrapper for the ChatQueryProvider to enable use in server components
 */
export const ClientChatQueryProvider: React.FC<ClientQueryProviderProps> = ({
  children,
}) => {
  return <ChatQueryProvider>{children}</ChatQueryProvider>;
};