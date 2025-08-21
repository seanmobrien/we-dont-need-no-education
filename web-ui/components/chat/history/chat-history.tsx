
/**
 * @module ChatHistory
 * @fileoverview
 * ChatHistory component module: provides a full, virtualized, scrollable view of a single chat conversation's message history.
 *
 * - Fetches chat data (turns, title, creation time) by chatId using a custom React Query hook.
 * - Handles loading, error, and empty states with clear user feedback and retry affordance.
 * - Renders chat turns using a high-performance virtualized display for scalability.
 * - Title resolution logic prioritizes explicit prop, then fetched title, then fallback.
 *
 * Usage:
 * ```tsx
 * <ChatHistory chatId="abc123" title="My Chat" />
 * ```
 *
 * Exported Components:
 * - ChatHistory: Main React component for displaying a chat transcript by id.
 */
'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { VirtualizedChatDisplay } from '@/components/chat/virtualized-chat-display';
import { useChatHistory } from './useChatHistory';
import Loading from '@/components/general/loading';


/**
 * ChatHistory component: displays the full message history for a given chat, including title, creation time, and all turns/messages.
 *
 * @param chatId - Unique identifier for the chat transcript to load and display.
 * @param title - (Optional) Explicit title to display; if omitted, falls back to fetched title or a generated default.
 *
 * @remarks
 * - Uses `useChatHistory` hook for data fetching and error/loading state management.
 * - Renders a virtualized chat display for performance with large transcripts.
 * - Handles error and empty states with user-friendly messaging and retry option.
 *
 * @example
 * <ChatHistory chatId="abc123" />
 * <ChatHistory chatId="abc123" title="My Custom Title" />
 */
export const ChatHistory = ({ chatId, title: titleFromProps }: { chatId: string; title?: string }) => {
  const { data, isLoading, isError, error, refetch } = useChatHistory(chatId);

  // Title resolution rules:
  // 1. If a non-empty title prop is provided, use it.
  // 2. Otherwise fall back to the fetched chat title (if any).
  // 3. Otherwise use the generated default `Chat <suffix>`.
  const resolvedTitleFromProps = titleFromProps && titleFromProps.trim().length > 0 ? titleFromProps.trim() : null;
  const effectiveTitle = resolvedTitleFromProps ?? (data?.title && data.title.trim().length > 0 ? data.title : null);

  if (isError) {
    return (
      <Box>        
        <Typography color="error" gutterBottom>
          Failed to load chat
        </Typography>
        <Typography variant="body2" gutterBottom>
          {(error as Error).message}
        </Typography>
        <Typography variant="body2" sx={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => refetch()}>
          Retry
        </Typography>
      </Box>
    );
  }
  return (
    <>
      <Typography variant="h4" gutterBottom>
        {effectiveTitle || `Chat ${chatId.slice(-8)}`}
      </Typography>
      {data && <Typography variant="body2" color="text.secondary" gutterBottom>
        Created: {new Date(data.createdAt).toLocaleString()}
      </Typography> }
      <Box sx={{ mt: 3 }}>
        <Loading loading={isLoading} />
        {!data 
          ? !isLoading && <Typography>No chat found.</Typography>
          : <VirtualizedChatDisplay turns={data.turns} height={800} />}                
      </Box>
    </>
  );
};