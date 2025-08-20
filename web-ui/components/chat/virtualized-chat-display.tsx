"use client";

import React, { useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Switch, FormControlLabel, FormGroup, Paper } from '@mui/material';
import { ChatTurnDisplay } from './chat-turn-display';
import { 
  createElementMeasurer, 
  createTextMeasurer, 
  estimateMarkdownHeight 
} from '@/lib/components/ai/height-estimators';

const elementMeasurer = createElementMeasurer();
const textMeasurer = createTextMeasurer();

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

  // Estimate size for each turn based on content using improved measurement
  const estimateSize = useCallback((index: number) => {
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
    let totalHeight = 120; // Increased base turn header height to account for chips and spacing

    // Calculate content width accounting for Card padding and margins
    const contentWidth = Math.max(width * 0.85 - 48, 300); // 85% width minus Card padding, min 300px

    // Measure each message content using sophisticated height estimation
    turn.messages.forEach(message => {
      if (message.content && message.content.trim()) {
        // Use sophisticated markdown height estimation
        const estimatedHeight = estimateMarkdownHeight(
          message.content,
          contentWidth,
          textMeasurer
        );
        
        // Add message container padding and margins
        totalHeight += estimatedHeight + 32; // content height + message container padding
      } else {
        // Base message height for messages without content (tool calls, etc)
        totalHeight += 60; // Increased from 40 to account for message container
      }
      
      // Add spacing between messages
      totalHeight += 16;
    });

    // Add size if properties are shown
    if (showTurnProperties) {
      totalHeight += 150; // Increased space for model, temperature, latency etc
      
      // Add space for warnings and errors using proper estimation
      if (turn.warnings?.length) {
        turn.warnings.forEach(warning => {
          const warningHeight = estimateMarkdownHeight(
            warning,
            contentWidth * 0.9, // Slightly narrower for alerts
            textMeasurer
          );
          totalHeight += warningHeight + 24; // Alert padding
        });
      }
      
      if (turn.errors?.length) {
        turn.errors.forEach(error => {
          const errorHeight = estimateMarkdownHeight(
            error,
            contentWidth * 0.9, // Slightly narrower for alerts  
            textMeasurer
          );
          totalHeight += errorHeight + 24; // Alert padding
        });
      }
      
      // Add space for metadata if present
      if (turn.metadata) {
        const metadataLines = JSON.stringify(turn.metadata, null, 2).split('\n').length;
        totalHeight += Math.min(metadataLines * 16, 200); // Cap metadata display at 200px
      }
    }

    // Add space for message metadata display if enabled
    if (showMessageMetadata) {
      turn.messages.forEach(message => {
        totalHeight += 80; // Base metadata panel height
        
        // Add space for function call and metadata JSON
        if (message.functionCall) {
          const funcCallLines = JSON.stringify(message.functionCall, null, 2).split('\n').length;
          totalHeight += Math.min(funcCallLines * 16, 200); // Cap at 200px
        }
        
        if (message.metadata) {
          const msgMetadataLines = JSON.stringify(message.metadata, null, 2).split('\n').length;
          totalHeight += Math.min(msgMetadataLines * 16, 200); // Cap at 200px  
        }
      });
    }

    // Add padding for Paper component and margins
    totalHeight += 48; // Card padding and margins
    
    // Remove artificial cap - let content be as tall as it needs to be
    // Only set a reasonable minimum height
    return Math.max(totalHeight, 150);
  }, [turns, showTurnProperties, showMessageMetadata]);

  const rowVirtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 3, // Render more items outside visible area for smoother scrolling
    measureElement: 
      typeof window !== 'undefined' && window.ResizeObserver
        ? (element) => element?.getBoundingClientRect().height
        : undefined, // Enable dynamic measurement when ResizeObserver is available
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
                data-index={virtualItem.index}
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