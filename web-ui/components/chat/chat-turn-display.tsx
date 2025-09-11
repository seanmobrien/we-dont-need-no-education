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
  FormControlLabel
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { ChatMessageDisplay } from './chat-message-display';
import { ChatTurn } from '@/lib/ai/chat/types';
import type { SelectedChatItem } from '@/lib/chat/export';

interface ChatTurnDisplayProps {
  turn: ChatTurn;
  showTurnProperties?: boolean;
  showMessageMetadata?: boolean;
  enableSelection?: boolean;
  selectedItems?: SelectedChatItem[];
  onSelectionChange?: (selectedItems: SelectedChatItem[]) => void;
}

export const ChatTurnDisplay: React.FC<ChatTurnDisplayProps> = ({ 
  turn, 
  showTurnProperties = false,
  showMessageMetadata = false,
  enableSelection = false,
  selectedItems = [],
  onSelectionChange
}) => {
  const [propertiesExpanded, setPropertiesExpanded] = useState(false);

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

        {/* Messages */}
        {turn.messages.map((message) => {
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
        })}
      </CardContent>
    </Card>
  );
};