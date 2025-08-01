"use client";

import React, { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Switch, FormControlLabel, FormGroup, Paper } from '@mui/material';
import { ChatTurnDisplay } from './chat-turn-display';

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

interface VirtualizedChatDisplayProps {
  turns: ChatTurn[];
  height?: number;
}

export const VirtualizedChatDisplay: React.FC<VirtualizedChatDisplayProps> = ({ 
  turns, 
  height = 600 
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showTurnProperties, setShowTurnProperties] = useState(false);
  const [showMessageMetadata, setShowMessageMetadata] = useState(false);

  // Estimate size for each turn based on content
  const estimateSize = (index: number) => {
    const turn = turns[index];
    if (!turn) return 200; // default fallback
    
    // Base size for turn header and card structure
    let size = 100;
    
    // Add size for each message
    size += turn.messages.length * 120; // base message size
    
    // Add extra size for messages with content
    turn.messages.forEach(message => {
      if (message.content) {
        // Rough estimate based on content length
        const lines = message.content.split('\n').length;
        size += Math.max(lines * 20, 40);
      }
    });
    
    // Add size if properties are shown
    if (showTurnProperties) {
      size += 200; // space for expanded properties
      if (turn.warnings?.length) size += turn.warnings.length * 60;
      if (turn.errors?.length) size += turn.errors.length * 60;
    }
    
    return Math.min(size, 1000); // cap at reasonable max
  };

  const rowVirtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 2, // Render a few items outside of the visible area
  });

  return (
    <Box>
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <FormGroup row>
          <FormControlLabel
            control={
              <Switch
                checked={showTurnProperties}
                onChange={(e) => setShowTurnProperties(e.target.checked)}
              />
            }
            label="Show Turn Properties (model, temp, latency, warnings, errors, token usage)"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showMessageMetadata}
                onChange={(e) => setShowMessageMetadata(e.target.checked)}
              />
            }
            label="Show Message Metadata"
          />
        </FormGroup>
      </Paper>

      {/* Virtualized Chat Display */}
      <Box
        ref={parentRef}
        sx={{
          height: `${height}px`,
          overflow: 'auto',
          width: '100%',
        }}
      >
        <Box
          sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const turn = turns[virtualItem.index];
            
            return (
              <Box
                key={virtualItem.key}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ChatTurnDisplay
                  turn={turn}
                  showTurnProperties={showTurnProperties}
                  showMessageMetadata={showMessageMetadata}
                />
              </Box>
            );
          })}
        </Box>
      </Box>

      {turns.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          No messages found in this chat.
        </Paper>
      )}
    </Box>
  );
};