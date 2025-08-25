
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
import { Box, Typography, Grid, Card, CardContent, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { VirtualizedChatDisplay } from '@/components/chat/virtualized-chat-display';
import { useChatHistory } from './useChatHistory';
import { Loading } from '@/components/general/loading';
import type { ChatDetails } from '@/lib/ai/chat/types';


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
  // Calculate chat statistics
  const calculateStats = (chatDetails: ChatDetails) => {
    const turns = chatDetails.turns;
    const totalMessages = turns.reduce((sum, turn) => sum + turn.messages.length, 0);
    const totalTokens = turns.reduce((sum, turn) => {
      if (turn.metadata?.totalTokens) {
        return sum + (turn.metadata.totalTokens as number);
      }
      return sum;
    }, 0);
    
    const toolUsage = turns.reduce((acc, turn) => {
      turn.messages.forEach(msg => {
        if (msg.toolName) {
          acc[msg.toolName] = (acc[msg.toolName] || 0) + 1;
        }
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTurns: turns.length,
      totalMessages,
      totalTokens,
      toolUsage,
      avgLatency: turns.filter(t => t.latencyMs).reduce((sum, t) => sum + (t.latencyMs || 0), 0) / Math.max(turns.filter(t => t.latencyMs).length, 1),
    };
  };

  const stats = data ? calculateStats(data) : null;

  return (
    <>
      <Typography variant="h4" gutterBottom>
        {effectiveTitle || `Chat ${chatId.slice(-8)}`}
      </Typography>
      {data && (
        <>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Created: {new Date(data.createdAt).toLocaleString()}
          </Typography>
          
          {/* Chat Statistics */}
          <Accordion sx={{ mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Chat Statistics & Metadata</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid gridColumn={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {stats?.totalTurns || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Turns
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid gridColumn={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {stats?.totalMessages || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Messages
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid gridColumn={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {stats?.totalTokens || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Tokens
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid gridColumn={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {stats?.avgLatency ? Math.round(stats.avgLatency) : 0}ms
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Latency
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                {stats?.toolUsage && Object.keys(stats.toolUsage).length > 0 && (
                  <Grid gridColumn={{ xs: 12 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Tool Usage
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(stats.toolUsage).map(([tool, count]) => (
                        <Chip 
                          key={tool} 
                          label={`${tool}: ${count}`} 
                          size="small" 
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Loading loading={isLoading} />
        {!data 
          ? !isLoading && <Typography>No chat found.</Typography>
          : <VirtualizedChatDisplay turns={data.turns} height={800} />}                
      </Box>
    </>
  );
};