"use client";

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  Card, 
  CardContent, 
  IconButton,
  Collapse,
  Paper,
  Grid,
  Divider,
  Alert,
  Checkbox,
  FormControlLabel,
  Badge,
  Button,
  Switch
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { ChatMessageDisplay } from './chat-message-display';
import { ChatTurn } from '@/lib/ai/chat/types';
import type { SelectedChatItem } from '@/lib/chat/export';

// Available message types for per-turn filtering
const MESSAGE_TYPES = ['user', 'assistant', 'system', 'tool'] as const;
type MessageType = typeof MESSAGE_TYPES[number];

interface ChatTurnDisplayProps {
  turn: ChatTurn;
  showTurnProperties?: boolean;
  showMessageMetadata?: boolean;
  enableSelection?: boolean;
  selectedItems?: SelectedChatItem[];
  onSelectionChange?: (selectedItems: SelectedChatItem[]) => void;
  globalFilters?: Set<string>;
}

export const ChatTurnDisplay: React.FC<ChatTurnDisplayProps> = ({ 
  turn, 
  showTurnProperties = false,
  showMessageMetadata = false,
  enableSelection = false,
  selectedItems = [],
  onSelectionChange,
  globalFilters = new Set()
}) => {
  const [propertiesExpanded, setPropertiesExpanded] = useState(false);
  
  // Per-turn filtering state
  const [enableTurnFilters, setEnableTurnFilters] = useState(false);
  const [activeTurnFilters, setActiveTurnFilters] = useState<Set<MessageType>>(new Set());

  // Per-turn filter handling functions
  const toggleTurnFilter = (messageType: MessageType) => {
    const newFilters = new Set(activeTurnFilters);
    if (newFilters.has(messageType)) {
      newFilters.delete(messageType);
    } else {
      newFilters.add(messageType);
    }
    setActiveTurnFilters(newFilters);
  };

  const clearAllTurnFilters = () => {
    setActiveTurnFilters(new Set());
  };

  // Get available message types in this specific turn after global filtering
  const getAvailableMessageTypesInTurn = (): MessageType[] => {
    // First, get messages that pass global filters (or all if no global filters)
    const globallyFilteredMessages = globalFilters.size > 0 
      ? turn.messages.filter(message => globalFilters.has(message.role))
      : turn.messages;
    
    // Then find unique types in those messages
    const typesInTurn = new Set<MessageType>();
    globallyFilteredMessages.forEach(message => {
      if (MESSAGE_TYPES.includes(message.role as MessageType)) {
        typesInTurn.add(message.role as MessageType);
      }
    });
    return Array.from(typesInTurn).sort();
  };

  // Apply both global and per-turn filters to messages
  const getFilteredMessages = () => {
    let filteredMessages = turn.messages;

    // First apply global filters if active
    if (globalFilters.size > 0) {
      filteredMessages = filteredMessages.filter(message => 
        globalFilters.has(message.role as MessageType)
      );
    }

    // Then apply per-turn filters if active
    if (enableTurnFilters && activeTurnFilters.size > 0) {
      filteredMessages = filteredMessages.filter(message => 
        activeTurnFilters.has(message.role as MessageType)
      );
    }

    return filteredMessages;
  };

  const availableTypesInTurn = getAvailableMessageTypesInTurn();
  const filteredMessages = getFilteredMessages();

  // Check if this turn is selected
  const isTurnSelected = selectedItems.some(
    item => item.type === 'turn' && item.turnId === turn.turnId
  );

  // Check if individual messages are selected
  const getSelectedMessages = () => {
    return selectedItems.filter(
      item => item.type === 'message' && item.turnId === turn.turnId
    );
  };

  const selectedMessages = getSelectedMessages();
  const isPartiallySelected = selectedMessages.length > 0 && selectedMessages.length < turn.messages.length;

  const handleTurnSelectionChange = (checked: boolean) => {
    if (!onSelectionChange) return;

    let newSelection = [...selectedItems];
    
    if (checked) {
      // Remove any individual message selections for this turn
      newSelection = newSelection.filter(
        item => !(item.type === 'message' && item.turnId === turn.turnId)
      );
      // Add turn selection
      newSelection.push({ type: 'turn', turnId: turn.turnId });
    } else {
      // Remove turn selection
      newSelection = newSelection.filter(
        item => !(item.type === 'turn' && item.turnId === turn.turnId)
      );
    }
    
    onSelectionChange(newSelection);
  };

  const handleMessageSelectionChange = (messageId: number, checked: boolean) => {
    if (!onSelectionChange) return;

    let newSelection = [...selectedItems];
    
    // Remove turn selection if it exists (since we're selecting individual messages)
    newSelection = newSelection.filter(
      item => !(item.type === 'turn' && item.turnId === turn.turnId)
    );
    
    if (checked) {
      // Add message selection if not already present
      if (!newSelection.some(item => 
        item.type === 'message' && item.turnId === turn.turnId && item.messageId === messageId
      )) {
        newSelection.push({ type: 'message', turnId: turn.turnId, messageId });
      }
    } else {
      // Remove message selection
      newSelection = newSelection.filter(
        item => !(item.type === 'message' && item.turnId === turn.turnId && item.messageId === messageId)
      );
    }
    
    onSelectionChange(newSelection);
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'In progress...';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    return `${durationMs}ms`;
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        {/* Turn Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          {enableSelection && (
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={isTurnSelected}
                  indeterminate={isPartiallySelected && !isTurnSelected}
                  onChange={(e) => handleTurnSelectionChange(e.target.checked)}
                />
              }
              label=""
              sx={{ mr: 1, '& .MuiFormControlLabel-label': { display: 'none' } }}
            />
          )}
          <Chip 
            label={`Turn ${turn.turnId}`} 
            variant="outlined" 
            size="small"
          />
          {turn.modelName && (
            <Chip 
              label={turn.modelName} 
              variant="outlined" 
              size="small"
              color="primary"
            />
          )}
          {turn.latencyMs && (
            <Chip 
              label={`${turn.latencyMs}ms`}
              variant="outlined" 
              size="small"
              icon={<ScheduleIcon fontSize="small" />}
            />
          )}
          {turn.warnings && turn.warnings.length > 0 && (
            <Chip 
              label={`${turn.warnings.length} warning${turn.warnings.length > 1 ? 's' : ''}`}
              variant="outlined" 
              size="small"
              icon={<WarningIcon fontSize="small" />}
              color="warning"
            />
          )}
          {turn.errors && turn.errors.length > 0 && (
            <Chip 
              label={`${turn.errors.length} error${turn.errors.length > 1 ? 's' : ''}`}
              variant="outlined" 
              size="small"
              icon={<ErrorIcon fontSize="small" />}
              color="error"
            />
          )}
          {showTurnProperties && (
            <IconButton
              size="small"
              onClick={() => setPropertiesExpanded(!propertiesExpanded)}
              sx={{ ml: 'auto' }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Turn Properties (when expanded) */}
        {showTurnProperties && (
          <Collapse in={propertiesExpanded}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }} elevation={3}>
              <Typography variant="subtitle2" gutterBottom>
                Turn Properties
              </Typography>
              <Grid container spacing={2}>
                <Grid
                  size={{
                    xs: 6,
                    md: 3
                  }}>
                  <Typography variant="caption" display="block">
                    Status ID: {turn.statusId}
                  </Typography>
                </Grid>
                <Grid
                  size={{
                    xs: 6,
                    md: 3
                  }}>
                  <Typography variant="caption" display="block">
                    Created: {new Date(turn.createdAt).toLocaleString()}
                  </Typography>
                </Grid>
                {turn.completedAt && (
                  <Grid
                    size={{
                      xs: 6,
                      md: 3
                    }}>
                    <Typography variant="caption" display="block">
                      Completed: {new Date(turn.completedAt).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                <Grid
                  size={{
                    xs: 6,
                    md: 3
                  }}>
                  <Typography variant="caption" display="block">
                    Duration: {formatDuration(turn.createdAt, turn.completedAt)}
                  </Typography>
                </Grid>
                {turn.temperature !== null && (
                  <Grid
                    size={{
                      xs: 6,
                      md: 3
                    }}>
                    <Typography variant="caption" display="block">
                      Temperature: {turn.temperature}
                    </Typography>
                  </Grid>
                )}
                {turn.topP !== null && (
                  <Grid
                    size={{
                      xs: 6,
                      md: 3
                    }}>
                    <Typography variant="caption" display="block">
                      Top P: {turn.topP}
                    </Typography>
                  </Grid>
                )}
                {turn.latencyMs !== null && (
                  <Grid
                    size={{
                      xs: 6,
                      md: 3
                    }}>
                    <Typography variant="caption" display="block">
                      Latency: {turn.latencyMs}ms
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {/* Warnings */}
              {turn.warnings && turn.warnings.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" display="block" gutterBottom>
                    Warnings:
                  </Typography>
                  {turn.warnings.map((warning, index) => (
                    <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                      {warning}
                    </Alert>
                  ))}
                </Box>
              )}

              {/* Errors */}
              {turn.errors && turn.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" display="block" gutterBottom>
                    Errors:
                  </Typography>
                  {turn.errors.map((error, index) => (
                    <Alert key={index} severity="error" sx={{ mb: 1 }}>
                      {error}
                    </Alert>
                  ))}
                </Box>
              )}

              {/* Turn Metadata */}
              {turn.metadata && (
                <Paper sx={{ mt: 2 }} elevation={4}>
                  <Typography variant="caption" display="block" gutterBottom>
                    Turn Metadata:
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      fontSize: '0.75rem',
                      // backgroundColor: 'grey.100',
                      p: 1,
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 200,
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                      maxWidth: '100%'
                    }}
                  >
                    {JSON.stringify(turn.metadata, null, 2)}
                  </Box>
                </Paper>
              )}
            </Paper>
            <Divider sx={{ mb: 2 }} />
          </Collapse>
        )}

        {/* Per-Turn Message Filtering Controls */}
        {availableTypesInTurn.length > 1 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: enableTurnFilters ? 2 : 0 }}>
              <FilterListIcon color="action" fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Turn Filters</Typography>
              <Switch
                size="small"
                checked={enableTurnFilters}
                onChange={(e) => {
                  setEnableTurnFilters(e.target.checked);
                  if (!e.target.checked) {
                    clearAllTurnFilters();
                  }
                }}
              />
            </Box>
            
            {enableTurnFilters && (
              <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1, fontSize: '0.875rem' }}>
                    Show:
                  </Typography>
                  {availableTypesInTurn.map((messageType) => {
                    const isActive = activeTurnFilters.has(messageType);
                    // Count messages of this type that are available after global filtering
                    const globallyFilteredMessages = globalFilters.size > 0 
                      ? turn.messages.filter(message => globalFilters.has(message.role))
                      : turn.messages;
                    const messageCount = globallyFilteredMessages.filter(msg => msg.role === messageType).length;
                    
                    return (
                      <Badge
                        key={messageType}
                        badgeContent={messageCount}
                        color={isActive ? 'primary' : 'default'}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => toggleTurnFilter(messageType)}
                      >
                        <Chip
                          label={messageType}
                          variant={isActive ? 'filled' : 'outlined'}
                          color={isActive ? 'primary' : 'default'}
                          size="small"
                          onClick={() => toggleTurnFilter(messageType)}
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
                  
                  {activeTurnFilters.size > 0 && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={clearAllTurnFilters}
                      sx={{ ml: 1, fontSize: '0.75rem', py: 0.5 }}
                    >
                      Clear
                    </Button>
                  )}
                </Box>
                
                {activeTurnFilters.size > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Showing {activeTurnFilters.size} of {availableTypesInTurn.length} message types in this turn
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Paper>
        )}

        {/* Messages */}
        {filteredMessages.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
            {globalFilters.size > 0 && (enableTurnFilters && activeTurnFilters.size > 0) 
              ? 'No messages match the current global and turn filters.'
              : globalFilters.size > 0
              ? 'No messages match the current global filters.'
              : enableTurnFilters && activeTurnFilters.size > 0
              ? 'No messages match the current turn filters.'
              : 'No messages in this turn.'
            }
          </Typography>
        ) : (
          filteredMessages.map((message) => {
            const isMessageSelected = isTurnSelected || selectedItems.some(
              item => item.type === 'message' && item.turnId === turn.turnId && item.messageId === message.messageId
            );
            
            return (
              <ChatMessageDisplay 
                key={`${message.turnId}-${message.messageId}`}
                message={message}
                showMetadata={showMessageMetadata}
                enableSelection={enableSelection}
                isSelected={isMessageSelected}
                onSelectionChange={handleMessageSelectionChange}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
};