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
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Button,
  Paper,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { VirtualizedChatDisplay } from '@/components/chat/virtualized-chat-display';
import { ChatExportMenu } from '@/components/chat/chat-export-menu';
import {
  ChatMessageFilters,
  type MessageType,
  searchMessageContent,
} from '@/components/chat/chat-message-filters';
import { useChatHistory } from './useChatHistory';
import { Loading } from '@/components/general/loading';
import type { ChatDetails, ChatTurn } from '@/lib/ai/chat/types';
import type { SelectedChatItem } from '../../../lib/ai/chat/export';

/**
 * Get all messages from the chat for filter component
 * Pure function for better performance
 */
const getAllMessages = (chatDetails: ChatDetails) => {
  return chatDetails.turns.flatMap((turn) => turn.messages);
};

/**
 * Apply global chat-level filters to the chat data
 * Pure function for better performance
 */
const getFilteredTurns = (
  chatDetails: ChatDetails,
  enableFilters: boolean,
  activeFilters: Set<MessageType>,
  contentFilter: string,
): ChatTurn[] => {
  if (!enableFilters) {
    return chatDetails.turns;
  }

  // Global filtering: only hide entire turns if ALL messages in the turn are filtered out
  return chatDetails.turns.filter((turn) => {
    // Apply global filters to the turn's messages
    const filteredMessages = turn.messages.filter((message) => {
      // Type filter
      const passesTypeFilter =
        activeFilters.size === 0 ||
        activeFilters.has(message.role as MessageType);
      // Content filter
      const passesContentFilter = searchMessageContent(message, contentFilter);

      return passesTypeFilter && passesContentFilter;
    });
    // Only hide the turn if no messages match the filters (all messages filtered out)
    return filteredMessages.length > 0;
  });
};

/**
 * Calculate chat statistics
 * Pure function for better performance
 */
const calculateStats = (chatDetails: ChatDetails) => {
  const turns = chatDetails.turns;
  const totalMessages = turns.reduce(
    (sum, turn) => sum + turn.messages.length,
    0,
  );
  const totalTokens = turns.reduce((sum, turn) => {
    if (turn.metadata?.totalTokens) {
      return sum + (turn.metadata.totalTokens as number);
    }
    return sum;
  }, 0);

  const toolUsage = turns.reduce(
    (acc, turn) => {
      turn.messages.forEach((msg) => {
        if (msg.toolName) {
          acc[msg.toolName] = (acc[msg.toolName] || 0) + 1;
        }
      });
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    totalTurns: turns.length,
    totalMessages,
    totalTokens,
    toolUsage,
    avgLatency:
      turns
        .filter((t) => t.latencyMs)
        .reduce((sum, t) => sum + (t.latencyMs || 0), 0) /
      Math.max(turns.filter((t) => t.latencyMs).length, 1),
  };
};

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

export const ChatHistory = ({
  chatId,
  title: titleFromProps,
}: {
  chatId: string;
  title?: string;
}) => {
  const { data, isLoading, isError, error, refetch } = useChatHistory(chatId);
  const [enableSelection, setEnableSelection] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<SelectedChatItem[]>(
    [],
  );

  // Filter state - Global chat-level filtering
  const [enableFilters, setEnableFilters] = React.useState(false);
  const [activeFilters, setActiveFilters] = React.useState<Set<MessageType>>(
    new Set(),
  );
  const [contentFilter, setContentFilter] = React.useState('');

  // Memoize filtered data computation
  const filteredData = React.useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      turns: getFilteredTurns(
        data,
        enableFilters,
        activeFilters,
        contentFilter,
      ),
    };
  }, [data, enableFilters, activeFilters, contentFilter]);

  // Memoize all messages computation
  const allMessages = React.useMemo(() => {
    return data ? getAllMessages(data) : [];
  }, [data]);

  // Memoize stats computation
  const stats = React.useMemo(() => {
    return filteredData ? calculateStats(filteredData) : null;
  }, [filteredData]);

  // Title resolution rules - memoized to prevent re-computation
  const effectiveTitle = React.useMemo(() => {
    const resolvedTitleFromProps =
      titleFromProps && titleFromProps.trim().length > 0
        ? titleFromProps.trim()
        : null;
    return (
      resolvedTitleFromProps ??
      (data?.title && data.title.trim().length > 0 ? data.title : null)
    );
  }, [titleFromProps, data?.title]);

  // Stable event handlers
  const handleSelectAll = React.useCallback(() => {
    if (!filteredData) return;

    // Select all turns from filtered data
    const allTurns: SelectedChatItem[] = filteredData.turns.map((turn) => ({
      type: 'turn' as const,
      turnId: turn.turnId,
    }));
    setSelectedItems(allTurns);
  }, [filteredData]);

  const handleClearSelection = React.useCallback(() => {
    setSelectedItems([]);
  }, []);

  const handleEnableSelectionChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEnableSelection(e.target.checked);
    },
    [],
  );

  // Clear selection when disabling selection mode
  React.useEffect(() => {
    if (!enableSelection) {
      setSelectedItems([]);
    }
  }, [enableSelection]);

  // Clear selection when disabling selection mode
  React.useEffect(() => {
    if (!enableSelection) {
      setSelectedItems([]);
    }
  }, [enableSelection]);

  if (isError) {
    return (
      <Box>
        <Typography color="error" gutterBottom>
          Failed to load chat
        </Typography>
        <Typography variant="body2" gutterBottom>
          {(error as Error).message}
        </Typography>
        <Typography
          variant="body2"
          sx={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => refetch()}
        >
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
      {data && (
        <>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Created: {new Date(data.createdAt).toLocaleString()}
          </Typography>

          {/* Global Chat-Level Message Filtering Controls */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <ChatMessageFilters
              messages={allMessages}
              enableFilters={enableFilters}
              onEnableFiltersChange={setEnableFilters}
              activeTypeFilters={activeFilters}
              onTypeFiltersChange={setActiveFilters}
              contentFilter={contentFilter}
              onContentFilterChange={setContentFilter}
              title="Global Message Filters"
              size="medium"
              showStatusMessage={true}
            />
          </Paper>

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
                {stats?.toolUsage &&
                  Object.keys(stats.toolUsage).length > 0 && (
                    <Grid gridColumn={{ xs: 12 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Tool Usage
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Object.entries(stats.toolUsage).map(
                          ([tool, count]) => (
                            <Chip
                              key={tool}
                              label={`${tool}: ${count}`}
                              size="small"
                              variant="outlined"
                            />
                          ),
                        )}
                      </Box>
                    </Grid>
                  )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </>
      )}

      {/* Export Controls */}
      {filteredData && (
        <Box
          sx={{ mt: 3, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={enableSelection}
                onChange={handleEnableSelectionChange}
              />
            }
            label="Enable Export Selection"
          />
          {enableSelection && (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={handleSelectAll}
                disabled={selectedItems.length === filteredData.turns.length}
              >
                Select All Turns
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleClearSelection}
                disabled={selectedItems.length === 0}
              >
                Clear Selection
              </Button>
              <Typography variant="body2" color="text.secondary">
                {selectedItems.length} item
                {selectedItems.length !== 1 ? 's' : ''} selected
              </Typography>
              <ChatExportMenu
                turns={filteredData.turns}
                selectedItems={selectedItems}
                chatTitle={effectiveTitle || undefined}
                chatCreatedAt={data?.createdAt}
              />
            </>
          )}
        </Box>
      )}

      <Box sx={{ mt: 1 }}>
        <Loading loading={isLoading} />
        {!filteredData ? (
          !isLoading && <Typography>No chat found.</Typography>
        ) : filteredData.turns.length === 0 ? (
          <Typography color="text.secondary">
            No messages match the current filters.
          </Typography>
        ) : (
          <VirtualizedChatDisplay
            turns={filteredData.turns}
            height={800}
            enableSelection={enableSelection}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            globalFilters={
              enableFilters
                ? { typeFilters: activeFilters, contentFilter }
                : { typeFilters: new Set(), contentFilter: '' }
            }
          />
        )}
      </Box>
    </>
  );
};
