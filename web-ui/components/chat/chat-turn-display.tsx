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
  Alert
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { ChatMessageDisplay } from './chat-message-display';

interface ChatMessage {
  turnId: number;
  messageId: number;
  role: string;
  content: string | null;
  messageOrder: number;
  toolName: string | null;
  functionCall: Record<string, unknown> | null;
  statusId: number;
  providerId: string | null;
  metadata: Record<string, unknown> | null;
  toolInstanceId: string | null;
  optimizedContent: string | null;
}

interface ChatTurn {
  turnId: number;
  createdAt: string;
  completedAt: string | null;
  modelName: string | null;
  messages: ChatMessage[];
  statusId: number;
  temperature: number | null;
  topP: number | null;
  latencyMs: number | null;
  warnings: string[] | null;
  errors: string[] | null;
  metadata: Record<string, unknown> | null;
}

interface ChatTurnDisplayProps {
  turn: ChatTurn;
  showTurnProperties?: boolean;
  showMessageMetadata?: boolean;
}

export const ChatTurnDisplay: React.FC<ChatTurnDisplayProps> = ({ 
  turn, 
  showTurnProperties = false,
  showMessageMetadata = false
}) => {
  const [propertiesExpanded, setPropertiesExpanded] = useState(false);

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
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Turn Properties
              </Typography>
              <Grid container spacing={2}>
                <Grid xs={6} md={3}>
                  <Typography variant="caption" display="block">
                    Status ID: {turn.statusId}
                  </Typography>
                </Grid>
                <Grid xs={6} md={3}>
                  <Typography variant="caption" display="block">
                    Created: {new Date(turn.createdAt).toLocaleString()}
                  </Typography>
                </Grid>
                {turn.completedAt && (
                  <Grid xs={6} md={3}>
                    <Typography variant="caption" display="block">
                      Completed: {new Date(turn.completedAt).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                <Grid xs={6} md={3}>
                  <Typography variant="caption" display="block">
                    Duration: {formatDuration(turn.createdAt, turn.completedAt)}
                  </Typography>
                </Grid>
                {turn.temperature !== null && (
                  <Grid xs={6} md={3}>
                    <Typography variant="caption" display="block">
                      Temperature: {turn.temperature}
                    </Typography>
                  </Grid>
                )}
                {turn.topP !== null && (
                  <Grid xs={6} md={3}>
                    <Typography variant="caption" display="block">
                      Top P: {turn.topP}
                    </Typography>
                  </Grid>
                )}
                {turn.latencyMs !== null && (
                  <Grid xs={6} md={3}>
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
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" display="block" gutterBottom>
                    Turn Metadata:
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      fontSize: '0.75rem',
                      backgroundColor: 'grey.100',
                      p: 1,
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 200,
                    }}
                  >
                    {JSON.stringify(turn.metadata, null, 2)}
                  </Box>
                </Box>
              )}
            </Paper>
            <Divider sx={{ mb: 2 }} />
          </Collapse>
        )}

        {/* Messages */}
        {turn.messages.map((message) => (
          <ChatMessageDisplay 
            key={`${message.turnId}-${message.messageId}`}
            message={message}
            showMetadata={showMessageMetadata}
          />
        ))}
      </CardContent>
    </Card>
  );
};