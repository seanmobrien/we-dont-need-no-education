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

/**
 * Get available message types from the provided messages
 * Pure function for better performance
 */
const getAvailableMessageTypes = (messages: ChatMessage[]): MessageType[] => {
  const typesInMessages = new Set<MessageType>();
  messages.forEach(message => {
    if (MESSAGE_TYPES.includes(message.role as MessageType)) {
      typesInMessages.add(message.role as MessageType);
    }
  });
  return Array.from(typesInMessages).sort();
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
  // Memoize available message types computation
  const availableTypes = React.useMemo(() => 
    getAvailableMessageTypes(messages), 
    [messages]
  );

  // Stable filter handling functions
  const toggleFilter = React.useCallback((messageType: MessageType) => {
    const newFilters = new Set(activeTypeFilters);
    if (newFilters.has(messageType)) {
      newFilters.delete(messageType);
    } else {
      newFilters.add(messageType);
    }
    onTypeFiltersChange(newFilters);
  }, [activeTypeFilters, onTypeFiltersChange]);

  const clearAllFilters = React.useCallback(() => {
    onTypeFiltersChange(new Set());
    onContentFilterChange('');
  }, [onTypeFiltersChange, onContentFilterChange]);

  // Stable switch handler
  const handleEnableFiltersChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onEnableFiltersChange(e.target.checked);
    if (!e.target.checked) {
      clearAllFilters();
    }
  }, [onEnableFiltersChange, clearAllFilters]);

  // Stable content filter handler
  const handleContentFilterChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onContentFilterChange(e.target.value);
  }, [onContentFilterChange]);

  // Pre-calculate size-dependent values
  const isSmall = size === 'small';
  
  // Memoize style objects to prevent re-creation
  const containerSx = React.useMemo(() => ({ 
    display: 'flex', 
    alignItems: 'center', 
    gap: 2, 
    mb: isSmall ? 1 : 2 
  }), [isSmall]);

  const textFieldSx = React.useMemo(() => ({ 
    minWidth: 200 
  }), []);

  const typesSectionSx = React.useMemo(() => ({ 
    display: 'flex', 
    flexWrap: 'wrap', 
    gap: 1, 
    alignItems: 'center' 
  }), []);

  const clearButtonSx = React.useMemo(() => ({ 
    ml: 1,
    fontSize: isSmall ? '0.75rem' : '0.875rem',
    py: isSmall ? 0.5 : undefined
  }), [isSmall]);

  const statusMessageSx = React.useMemo(() => ({ 
    mt: isSmall ? 0.5 : 1 
  }), [isSmall]);

  // Memoize status message text
  const statusMessage = React.useMemo(() => {
    if (!showStatusMessage || (activeTypeFilters.size === 0 && !contentFilter.trim())) {
      return null;
    }
    
    if (contentFilter.trim() && activeTypeFilters.size > 0) {
      return `Filtering by content "${contentFilter}" and ${activeTypeFilters.size} of ${availableTypes.length} message types`;
    } else if (contentFilter.trim()) {
      return `Filtering by content "${contentFilter}"`;
    } else {
      return `Showing ${activeTypeFilters.size} of ${availableTypes.length} message types`;
    }
  }, [showStatusMessage, activeTypeFilters.size, contentFilter, availableTypes.length]);

  return (
    <Box sx={containerSx}>
      <FilterList color="action" fontSize={isSmall ? 'small' : 'medium'} />
      <Typography variant={isSmall ? 'body2' : 'h6'} sx={{ fontWeight: isSmall ? 'medium' : 'normal' }}>
        {title}
      </Typography>
      <FormControlLabel
        control={
          <Switch
            size={isSmall ? 'small' : 'medium'}
            checked={enableFilters}
            onChange={handleEnableFiltersChange}
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
            onChange={handleContentFilterChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize={isSmall ? 'small' : 'medium'} />
                </InputAdornment>
              ),
            }}
            sx={textFieldSx}
          />

          {/* Type Filter Badges */}
          <Box sx={typesSectionSx}>
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
                <MessageTypeBadge
                  key={messageType}
                  messageType={messageType}
                  messageCount={messageCount}
                  isActive={isActive}
                  isSmall={isSmall}
                  onToggle={toggleFilter}
                />
              );
            })}
            
            {(activeTypeFilters.size > 0 || contentFilter.trim()) && (
              <Button
                size="small"
                variant="outlined"
                onClick={clearAllFilters}
                sx={clearButtonSx}
              >
                Clear All
              </Button>
            )}
          </Box>
          
          {statusMessage && (
            <Box sx={statusMessageSx}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ fontSize: isSmall ? '0.75rem' : '0.875rem' }}
              >
                {statusMessage}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

// Separate memoized component for message type badges to prevent unnecessary re-renders
const MessageTypeBadge = React.memo<{
  messageType: MessageType;
  messageCount: number;
  isActive: boolean;
  isSmall: boolean;
  onToggle: (messageType: MessageType) => void;
}>(function MessageTypeBadge({ messageType, messageCount, isActive, isSmall, onToggle }) {
  const handleClick = React.useCallback(() => {
    onToggle(messageType);
  }, [messageType, onToggle]);

  const badgeSx = React.useMemo(() => ({ cursor: 'pointer' }), []);
  
  const chipSx = React.useMemo(() => ({ 
    textTransform: 'capitalize' as const,
    '&:hover': { 
      backgroundColor: isActive ? 'primary.dark' : 'action.hover' 
    }
  }), [isActive]);

  return (
    <Badge
      badgeContent={messageCount}
      color={isActive ? 'primary' : 'default'}
      sx={badgeSx}
      onClick={handleClick}
    >
      <Chip
        label={messageType}
        variant={isActive ? 'filled' : 'outlined'}
        color={isActive ? 'primary' : 'default'}
        size={isSmall ? 'small' : 'medium'}
        onClick={handleClick}
        sx={chipSx}
      />
    </Badge>
  );
});