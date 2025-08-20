"use client";

import React, { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Switch, FormControlLabel, FormGroup, Paper } from '@mui/material';
import { ChatTurnDisplay } from './chat-turn-display';
import { createElementMeasurer } from '@/lib/components/ai/height-estimators';

const elementMeasurer = createElementMeasurer();

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

  // Estimate size for each turn based on content using elementMeasurer
  const estimateSize = (index: number) => {
    const turn = turns[index];
    if (!turn) return 200; // default fallback
    
    let width = 0;
    // Get container width for accurate measurement
    if (parentRef.current === null) {
      // Handle case where parentRef is not yet available
      if (typeof window !== 'undefined') {
        width = window.innerWidth * 0.9; // Fallback to 90% of viewport width
      } else {
        width = 1200; // Fallback to a default width
      }
    } else {
      width = parentRef.current.getBoundingClientRect().width;
    }

    // Base size for turn header and card structure
    let totalHeight = 80; // Base turn header height

    // Measure each message content using elementMeasurer
    turn.messages.forEach(message => {
      if (message.content) {
        // Use elementMeasurer to get accurate height estimation
        const estimatedHeight = elementMeasurer.measureMarkdown
          ? elementMeasurer.measureMarkdown({ text: message.content, width: width * 0.85 })
          : message.content.split('\n').length * 24; // fallback
        
        totalHeight += estimatedHeight;
      } else {
        // Base message height for messages without content (tool calls, etc)
        totalHeight += 40;
      }
      
      // Add spacing between messages
      totalHeight += 16;
    });

    // Add size if properties are shown
    if (showTurnProperties) {
      totalHeight += 120; // space for model, temperature, latency etc
      
      // Add space for warnings and errors
      if (turn.warnings?.length) {
        turn.warnings.forEach(warning => {
          const warningHeight = elementMeasurer.measureMarkdown
            ? elementMeasurer.measureMarkdown({ text: warning, width: width * 0.8 })
            : Math.max(warning.split('\n').length * 20, 40);
          totalHeight += warningHeight + 8;
        });
      }
      
      if (turn.errors?.length) {
        turn.errors.forEach(error => {
          const errorHeight = elementMeasurer.measureMarkdown
            ? elementMeasurer.measureMarkdown({ text: error, width: width * 0.8 })
            : Math.max(error.split('\n').length * 20, 40);
          totalHeight += errorHeight + 8;
        });
      }
    }

    // Add space for metadata display if enabled
    if (showMessageMetadata) {
      totalHeight += turn.messages.length * 40; // Additional space per message for metadata
    }

    // Add padding for Paper component and margins
    totalHeight += 32; // Paper padding
    totalHeight += 16; // Margin between turns
    
    return Math.min(totalHeight, 2000); // cap at reasonable max
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