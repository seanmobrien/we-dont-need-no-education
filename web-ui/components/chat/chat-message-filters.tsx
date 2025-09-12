/**
 * @module ChatMessageFilters
 * @fileoverview
 * Reusable component for message filtering in chat interfaces.
 * 
 * Provides filtering by:
 * - Message type (user, assistant, system, tool)
 * - Content text search across all message fields
 * 
 * Used by both global chat-level filtering and per-turn filtering.
 */
'use client';

import * as React from 'react';
import { 
  Box, 
  Typography, 
  FormControlLabel, 
  Switch, 
  Button, 
  Badge, 
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import { FilterList, Search } from '@mui/icons-material';
import type { ChatMessage } from '@/lib/ai/chat/types';

// Available message types for filtering
export const MESSAGE_TYPES = ['user', 'assistant', 'system', 'tool'] as const;
export type MessageType = typeof MESSAGE_TYPES[number];

export interface ChatMessageFiltersProps {
  // Data
  messages: ChatMessage[];
  
  // Filter state
  enableFilters: boolean;
  onEnableFiltersChange: (enabled: boolean) => void;
  activeTypeFilters: Set<MessageType>;
  onTypeFiltersChange: (filters: Set<MessageType>) => void;
  contentFilter: string;
  onContentFilterChange: (filter: string) => void;
  
  // UI customization
  title: string;
  size?: 'small' | 'medium';
  showStatusMessage?: boolean;
}

/**
 * Searches for text across all searchable fields in a message
 */
export const searchMessageContent = (message: ChatMessage, searchTerm: string): boolean => {
  if (!searchTerm.trim()) return true;
  
  const searchLower = searchTerm.toLowerCase();
  
  // Search in content fields
  if (message.content && message.content.toLowerCase().includes(searchLower)) return true;
  if (message.optimizedContent && message.optimizedContent.toLowerCase().includes(searchLower)) return true;
  if (message.toolName && message.toolName.toLowerCase().includes(searchLower)) return true;
  
  // Search in structured data
  if (message.functionCall) {
    try {
      const functionCallStr = JSON.stringify(message.functionCall).toLowerCase();
      if (functionCallStr.includes(searchLower)) return true;
    } catch {
      // Ignore JSON stringify errors
    }
  }
  
  if (message.toolResult) {
    try {
      const toolResultStr = JSON.stringify(message.toolResult).toLowerCase();
      if (toolResultStr.includes(searchLower)) return true;
    } catch {
      // Ignore JSON stringify errors
    }
  }
  
  return false;
};

export const ChatMessageFilters: React.FC<ChatMessageFiltersProps> = ({
  messages,
  enableFilters,
  onEnableFiltersChange,
  activeTypeFilters,
  onTypeFiltersChange,
  contentFilter,
  onContentFilterChange,
  title,
  size = 'medium',
  showStatusMessage = true,
}) => {
  // Get available message types from the provided messages
  const getAvailableMessageTypes = (): MessageType[] => {
    const typesInMessages = new Set<MessageType>();
    messages.forEach(message => {
      if (MESSAGE_TYPES.includes(message.role as MessageType)) {
        typesInMessages.add(message.role as MessageType);
      }
    });
    return Array.from(typesInMessages).sort();
  };

  const availableTypes = getAvailableMessageTypes();

  // Filter handling functions
  const toggleFilter = (messageType: MessageType) => {
    const newFilters = new Set(activeTypeFilters);
    if (newFilters.has(messageType)) {
      newFilters.delete(messageType);
    } else {
      newFilters.add(messageType);
    }
    onTypeFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onTypeFiltersChange(new Set());
    onContentFilterChange('');
  };

  const isSmall = size === 'small';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: isSmall ? 1 : 2 }}>
      <FilterList color="action" fontSize={isSmall ? 'small' : 'medium'} />
      <Typography variant={isSmall ? 'body2' : 'h6'} sx={{ fontWeight: isSmall ? 'medium' : 'normal' }}>
        {title}
      </Typography>
      <FormControlLabel
        control={
          <Switch
            size={isSmall ? 'small' : 'medium'}
            checked={enableFilters}
            onChange={(e) => {
              onEnableFiltersChange(e.target.checked);
              if (!e.target.checked) {
                clearAllFilters();
              }
            }}
          />
        }
        label="Enable Filtering"
      />

      {enableFilters && (
        <>
          {/* Content Filter Input */}
          <TextField
            size={isSmall ? 'small' : 'medium'}
            placeholder="Search message content..."
            value={contentFilter}
            onChange={(e) => onContentFilterChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize={isSmall ? 'small' : 'medium'} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />

          {/* Type Filter Badges */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ mr: 1, fontSize: isSmall ? '0.75rem' : '0.875rem' }}
            >
              Types:
            </Typography>
            {availableTypes.map((messageType) => {
              const isActive = activeTypeFilters.has(messageType);
              const messageCount = messages.filter(msg => msg.role === messageType).length;
              
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
                    size={isSmall ? 'small' : 'medium'}
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
            
            {(activeTypeFilters.size > 0 || contentFilter.trim()) && (
              <Button
                size="small"
                variant="outlined"
                onClick={clearAllFilters}
                sx={{ 
                  ml: 1,
                  fontSize: isSmall ? '0.75rem' : '0.875rem',
                  py: isSmall ? 0.5 : undefined
                }}
              >
                Clear All
              </Button>
            )}
          </Box>
          
          {showStatusMessage && (activeTypeFilters.size > 0 || contentFilter.trim()) && (
            <Box sx={{ mt: isSmall ? 0.5 : 1 }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ fontSize: isSmall ? '0.75rem' : '0.875rem' }}
              >
                {contentFilter.trim() && activeTypeFilters.size > 0 
                  ? `Filtering by content "${contentFilter}" and ${activeTypeFilters.size} of ${availableTypes.length} message types`
                  : contentFilter.trim()
                  ? `Filtering by content "${contentFilter}"`
                  : `Showing ${activeTypeFilters.size} of ${availableTypes.length} message types`
                }
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};