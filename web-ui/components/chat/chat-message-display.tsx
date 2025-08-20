"use client";

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  IconButton,
  Collapse,
  Paper,
  Grid,
  Divider
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface ChatMessage {
  turnId: number;
  messageId: number;
  role: string;
  content: string | null;
  messageOrder: number;
  toolName: string | null;
  // Additional message-level metadata fields
  functionCall: Record<string, unknown> | null;
  statusId: number;
  providerId: string | null;
  metadata: Record<string, unknown> | null;
  toolInstanceId: string | null;
  optimizedContent: string | null;
}

interface ChatMessageDisplayProps {
  message: ChatMessage;
  showMetadata?: boolean;
}

export const ChatMessageDisplay: React.FC<ChatMessageDisplayProps> = ({ 
  message, 
  showMetadata = false 
}) => {
  const [metadataExpanded, setMetadataExpanded] = useState(false);

  return (
    <Box 
      sx={{ 
        mb: 2, 
        p: 2, 
        bgcolor: message.role === 'user' ? 'action.hover' : 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      {/* Message Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
        <Chip 
          label={message.role} 
          size="small"
          color={message.role === 'user' ? 'secondary' : 'primary'}
        />
        {message.toolName && (
          <Chip 
            label={`Tool: ${message.toolName}`} 
            size="small"
            variant="outlined"
            icon={<CodeIcon fontSize="small" />}
          />
        )}
        {showMetadata && (
          <IconButton
            size="small"
            onClick={() => setMetadataExpanded(!metadataExpanded)}
            sx={{ ml: 'auto' }}
            aria-label={metadataExpanded ? 'Hide metadata' : 'Show more metadata'}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      {/* Message Content */}
      <Typography 
        variant="body2" 
        sx={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          mb: 1,
          maxWidth: '100%'
        }}
      >
        {message.content || '<no content>'}
      </Typography>
      {/* Optimized Content (if different from regular content) */}
      {message.optimizedContent && message.optimizedContent !== message.content && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="caption">Optimized Content</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography 
              variant="body2" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                maxWidth: '100%'
              }}
            >
              {message.optimizedContent}
            </Typography>
          </AccordionDetails>
        </Accordion>
      )}
      {/* Metadata Section */}
      {showMetadata && (
        <Collapse in={metadataExpanded}>
          <Divider sx={{ my: 1 }} />
          <Paper variant="outlined" sx={{ p: 2 }} elevation={3}>
            <Typography variant="subtitle2" gutterBottom>
              Message Metadata
            </Typography>
            <Grid container spacing={1}>
              <Grid size={6}>
                <Typography variant="caption" display="block">
                  Message ID: {message.messageId}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" display="block">
                  Order: {message.messageOrder}
                </Typography>
              </Grid>
              {message.providerId && (
                <Grid size={6}>
                  <Typography variant="caption" display="block">
                    Provider: {message.providerId}
                  </Typography>
                </Grid>
              )}
              <Grid size={6}>
                <Typography variant="caption" display="block">
                  Status ID: {message.statusId}
                </Typography>
              </Grid>
              {message.toolInstanceId && (
                <Grid size={12}>
                  <Typography variant="caption" display="block">
                    Tool Instance: {message.toolInstanceId}
                  </Typography>
                </Grid>
              )}
              {message.functionCall && (
                <Grid size={12}>
                  <Typography variant="caption" display="block">
                    Function Call:
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
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                      maxWidth: '100%'
                    }}
                  >
                    {JSON.stringify(message.functionCall, null, 2)}
                  </Box>
                </Grid>
              )}
              {message.metadata && (
                <Grid size={12}>
                  <Typography variant="caption" display="block">
                    Metadata:
                  </Typography>
                  <Paper
                    elevation={4}
                    component="pre"
                    sx={{
                      fontSize: '0.75rem',                      
                      p: 1,
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 200,
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                      maxWidth: '100%'
                    }}
                  >
                    {JSON.stringify(message.metadata, null, 2)}
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Collapse>
      )}
    </Box>
  );
};