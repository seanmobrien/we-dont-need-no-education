'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { VirtualizedChatDisplay } from '@/components/chat';
import { LoggedError } from '@/lib/react-util';
import { fetch } from '@/lib/nextjs-util';
import type { ChatDetails } from '@/lib/ai/chat';


/**
 * Fetch chat details (used by React Query)
 */
export async function fetchChatDetails(chatId: string): Promise<ChatDetails | null> {
  try {
    const response = await fetch(`/api/ai/chat/history/${chatId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);

    return (await response.json()) as ChatDetails;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      context: 'Fetching chat details',
      chatId,
    });
    throw error;
  }
}

/**
 * React Query hook wrapper (so tests can mock in one place)
 */
export function useChatDetails(chatId: string): UseQueryResult<ChatDetails | null, Error> {
  return useQuery<ChatDetails | null, Error>({
    queryKey: ['chatDetails', chatId],
    queryFn: () => fetchChatDetails(chatId),
    // We want a fresh fetch each mount but still allow quick refetches w/out loading flash.
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}


export const ChatHistory = ({ chatId, title: titleFromProps }: { chatId: string; title?: string }) => {
  const { data, isLoading, isError, error, refetch } = useChatDetails(chatId);

  // Title resolution rules:
  // 1. If a non-empty title prop is provided, use it.
  // 2. Otherwise fall back to the fetched chat title (if any).
  // 3. Otherwise use the generated default `Chat <suffix>`.
  const resolvedTitleFromProps = titleFromProps && titleFromProps.trim().length > 0 ? titleFromProps.trim() : null;
  const effectiveTitle = resolvedTitleFromProps ?? (data?.title && data.title.trim().length > 0 ? data.title : null);

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

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

  if (!data) {
    return <Typography>No chat found.</Typography>;
  }

  return (
    <>
      <Typography variant="h4" gutterBottom>
        {effectiveTitle || `Chat ${chatId.slice(-8)}`}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Created: {new Date(data.createdAt).toLocaleString()}
      </Typography>
      <Box sx={{ mt: 3 }}>
        <VirtualizedChatDisplay turns={data.turns} height={800} />
      </Box>
    </>
  );
};