
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
import { Box, Typography, Grid, Card, CardContent, Chip, Accordion, AccordionSummary, AccordionDetails, FormControlLabel, Switch, Button, Badge, Paper } from '@mui/material';
import { ExpandMore, FilterList } from '@mui/icons-material';
import { VirtualizedChatDisplay } from '@/components/chat/virtualized-chat-display';
import { ChatExportMenu } from '@/components/chat/chat-export-menu';
import { useChatHistory } from './useChatHistory';
import { Loading } from '@/components/general/loading';
import type { ChatDetails, ChatTurn } from '@/lib/ai/chat/types';
import type { SelectedChatItem } from '@/lib/chat/export';


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
// Available message types for filtering
const MESSAGE_TYPES = ['user', 'assistant', 'system', 'tool'] as const;
type MessageType = typeof MESSAGE_TYPES[number];

export const ChatHistory = ({ chatId, title: titleFromProps }: { chatId: string; title?: string }) => {
  const { data, isLoading, isError, error, refetch } = useChatHistory(chatId);
  const [enableSelection, setEnableSelection] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<SelectedChatItem[]>([]);
  
  // Filter state - Global chat-level filtering
  const [enableFilters, setEnableFilters] = React.useState(false);
  const [activeFilters, setActiveFilters] = React.useState<Set<MessageType>>(new Set());

  // Filter handling functions
  const toggleFilter = (messageType: MessageType) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(messageType)) {
      newFilters.delete(messageType);
    } else {
      newFilters.add(messageType);
    }
    setActiveFilters(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters(new Set());
  };

  // Apply global chat-level filters to the chat data
  const getFilteredTurns = (chatDetails: ChatDetails): ChatTurn[] => {
    if (!enableFilters || activeFilters.size === 0) {
      return chatDetails.turns;
    }

    // Global filtering: hide entire turns that don't contain any matching messages
    return chatDetails.turns.filter(turn => 
      turn.messages.some(message => activeFilters.has(message.role as MessageType))
    );
  };

  // Get available message types from the current chat
  const getAvailableMessageTypes = (chatDetails: ChatDetails): MessageType[] => {
    const typesInChat = new Set<MessageType>();
    chatDetails.turns.forEach(turn => {
      turn.messages.forEach(message => {
        if (MESSAGE_TYPES.includes(message.role as MessageType)) {
          typesInChat.add(message.role as MessageType);
        }
      });
    });
    return Array.from(typesInChat).sort();
  };

  // Title resolution rules:
  // 1. If a non-empty title prop is provided, use it.
  // 2. Otherwise fall back to the fetched chat title (if any).
  // 3. Otherwise use the generated default `Chat <suffix>`.
  const resolvedTitleFromProps = titleFromProps && titleFromProps.trim().length > 0 ? titleFromProps.trim() : null;
  const effectiveTitle = resolvedTitleFromProps ?? (data?.title && data.title.trim().length > 0 ? data.title : null);

  // Get filtered data
  const filteredData = data ? { ...data, turns: getFilteredTurns(data) } : null;
  const availableTypes = data ? getAvailableMessageTypes(data) : [];

  // Clear selection when disabling selection mode
  React.useEffect(() => {
    if (!enableSelection) {
      setSelectedItems([]);
    }
  }, [enableSelection]);

  const handleSelectAll = () => {
    if (!filteredData) return;
    
    // Select all turns from filtered data
    const allTurns: SelectedChatItem[] = filteredData.turns.map(turn => ({
      type: 'turn' as const,
      turnId: turn.turnId
    }));
    setSelectedItems(allTurns);
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

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

  const stats = filteredData ? calculateStats(filteredData) : null;

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <FilterList color="action" />
              <Typography variant="h6">Global Message Filters</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableFilters}
                    onChange={(e) => {
                      setEnableFilters(e.target.checked);
                      if (!e.target.checked) {
                        clearAllFilters();
                      }
                    }}
                  />
                }
                label="Enable Filtering"
              />
            </Box>
            
            {enableFilters && (
              <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    Show turns containing messages of type:
                  </Typography>
                  {availableTypes.map((messageType) => {
                    const isActive = activeFilters.has(messageType);
                    const messageCount = data.turns.reduce((count, turn) => 
                      count + turn.messages.filter(msg => msg.role === messageType).length, 0
                    );
                    
                    return (
                      <Badge
                        key={messageType}
                        badgeContent={messageCount}
                        color={isActive ? 'primary' : 'default'}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => toggleFilter(messageType)}
                      >
                        <Chip
                          label={messageType}
                          variant={isActive ? 'filled' : 'outlined'}
                          color={isActive ? 'primary' : 'default'}
                          onClick={() => toggleFilter(messageType)}
                          sx={{ 
                            textTransform: 'capitalize',
                            '&:hover': { 
                              backgroundColor: isActive ? 'primary.dark' : 'action.hover' 
                            }
                          }}
                        />
                      </Badge>
                    );
                  })}
                  
                  {activeFilters.size > 0 && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={clearAllFilters}
                      sx={{ ml: 1 }}
                    >
                      Clear All
                    </Button>
                  )}
                </Box>
                
                {activeFilters.size > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Showing {activeFilters.size} of {availableTypes.length} message types (hiding entire turns without matching messages)
                    </Typography>
                  </Box>
                )}
              </>
            )}
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
      
      {/* Export Controls */}
      {filteredData && (
        <Box sx={{ mt: 3, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={enableSelection}
                onChange={(e) => setEnableSelection(e.target.checked)}
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
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </Typography>
              <ChatExportMenu
                turns={filteredData.turns}
                selectedItems={selectedItems}
                chatTitle={effectiveTitle || undefined}
                chatCreatedAt={data.createdAt}
              />
            </>
          )}
        </Box>
      )}
      
      <Box sx={{ mt: 1 }}>
        <Loading loading={isLoading} />
        {!filteredData 
          ? !isLoading && <Typography>No chat found.</Typography>
          : filteredData.turns.length === 0
          ? <Typography color="text.secondary">No messages match the current filters.</Typography>
          : (
            <VirtualizedChatDisplay 
              turns={filteredData.turns} 
              height={800}
              enableSelection={enableSelection}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
            />
          )}                
      </Box>
    </>
  );
};