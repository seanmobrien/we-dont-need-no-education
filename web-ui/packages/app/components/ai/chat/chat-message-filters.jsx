'use client';
import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FilterList from '@mui/icons-material/FilterList';
import Search from '@mui/icons-material/Search';
export const MESSAGE_TYPES = ['user', 'assistant', 'system', 'tool'];
export const searchMessageContent = (message, searchTerm) => {
    if (!searchTerm.trim())
        return true;
    const searchLower = searchTerm.toLowerCase();
    if (message.content && message.content.toLowerCase().includes(searchLower))
        return true;
    if (message.optimizedContent &&
        message.optimizedContent.toLowerCase().includes(searchLower))
        return true;
    if (message.toolName && message.toolName.toLowerCase().includes(searchLower))
        return true;
    if (message.functionCall) {
        try {
            const functionCallStr = JSON.stringify(message.functionCall).toLowerCase();
            if (functionCallStr.includes(searchLower))
                return true;
        }
        catch {
        }
    }
    if (message.toolResult) {
        try {
            const toolResultStr = JSON.stringify(message.toolResult).toLowerCase();
            if (toolResultStr.includes(searchLower))
                return true;
        }
        catch {
        }
    }
    return false;
};
const getAvailableMessageTypes = (messages) => {
    const typesInMessages = new Set();
    messages.forEach((message) => {
        if (MESSAGE_TYPES.includes(message.role)) {
            typesInMessages.add(message.role);
        }
    });
    return Array.from(typesInMessages).sort();
};
export const ChatMessageFilters = ({ messages, enableFilters, onEnableFiltersChange, activeTypeFilters, onTypeFiltersChange, contentFilter, onContentFilterChange, title, size = 'medium', showStatusMessage = true, }) => {
    const availableTypes = React.useMemo(() => getAvailableMessageTypes(messages), [messages]);
    const toggleFilter = React.useCallback((messageType) => {
        const newFilters = new Set(activeTypeFilters);
        if (newFilters.has(messageType)) {
            newFilters.delete(messageType);
        }
        else {
            newFilters.add(messageType);
        }
        onTypeFiltersChange(newFilters);
    }, [activeTypeFilters, onTypeFiltersChange]);
    const clearAllFilters = React.useCallback(() => {
        onTypeFiltersChange(new Set());
        onContentFilterChange('');
    }, [onTypeFiltersChange, onContentFilterChange]);
    const handleEnableFiltersChange = React.useCallback((e) => {
        onEnableFiltersChange(e.target.checked);
        if (!e.target.checked) {
            clearAllFilters();
        }
    }, [onEnableFiltersChange, clearAllFilters]);
    const handleContentFilterChange = React.useCallback((e) => {
        onContentFilterChange(e.target.value);
    }, [onContentFilterChange]);
    const isSmall = size === 'small';
    const containerSx = React.useMemo(() => ({
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: isSmall ? 1 : 2,
    }), [isSmall]);
    const textFieldSx = React.useMemo(() => ({
        minWidth: 200,
    }), []);
    const typesSectionSx = React.useMemo(() => ({
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        alignItems: 'center',
    }), []);
    const clearButtonSx = React.useMemo(() => ({
        ml: 1,
        fontSize: isSmall ? '0.75rem' : '0.875rem',
        py: isSmall ? 0.5 : undefined,
    }), [isSmall]);
    const statusMessageSx = React.useMemo(() => ({
        mt: isSmall ? 0.5 : 1,
    }), [isSmall]);
    const statusMessage = React.useMemo(() => {
        if (!showStatusMessage ||
            (activeTypeFilters.size === 0 && !contentFilter.trim())) {
            return null;
        }
        if (contentFilter.trim() && activeTypeFilters.size > 0) {
            return `Filtering by content "${contentFilter}" and ${activeTypeFilters.size} of ${availableTypes.length} message types`;
        }
        else if (contentFilter.trim()) {
            return `Filtering by content "${contentFilter}"`;
        }
        else {
            return `Showing ${activeTypeFilters.size} of ${availableTypes.length} message types`;
        }
    }, [
        showStatusMessage,
        activeTypeFilters.size,
        contentFilter,
        availableTypes.length,
    ]);
    return (<Box sx={containerSx}>
      <FilterList color="action" fontSize={isSmall ? 'small' : 'medium'}/>
      <Typography variant={isSmall ? 'body2' : 'h6'} sx={{ fontWeight: isSmall ? 'medium' : 'normal' }}>
        {title}
      </Typography>
      <FormControlLabel control={<Switch size={isSmall ? 'small' : 'medium'} checked={enableFilters} onChange={handleEnableFiltersChange}/>} label="Enable Filtering"/>

      {enableFilters && (<>
          
          <TextField size={isSmall ? 'small' : 'medium'} placeholder="Search message content..." value={contentFilter} onChange={handleContentFilterChange} InputProps={{
                startAdornment: (<InputAdornment position="start">
                  <Search fontSize={isSmall ? 'small' : 'medium'}/>
                </InputAdornment>),
            }} sx={textFieldSx}/>

          
          <Box sx={typesSectionSx}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1, fontSize: isSmall ? '0.75rem' : '0.875rem' }}>
              Types:
            </Typography>
            {availableTypes.map((messageType) => {
                const isActive = activeTypeFilters.has(messageType);
                const messageCount = messages.filter((msg) => msg.role === messageType).length;
                return (<MessageTypeBadge key={messageType} messageType={messageType} messageCount={messageCount} isActive={isActive} isSmall={isSmall} onToggle={toggleFilter}/>);
            })}

            {(activeTypeFilters.size > 0 || contentFilter.trim()) && (<Button size="small" variant="outlined" onClick={clearAllFilters} sx={clearButtonSx}>
                Clear All
              </Button>)}
          </Box>

          {statusMessage && (<Box sx={statusMessageSx}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: isSmall ? '0.75rem' : '0.875rem' }}>
                {statusMessage}
              </Typography>
            </Box>)}
        </>)}
    </Box>);
};
const MessageTypeBadge = React.memo(function MessageTypeBadge({ messageType, messageCount, isActive, isSmall, onToggle, }) {
    const handleClick = React.useCallback(() => {
        onToggle(messageType);
    }, [messageType, onToggle]);
    const badgeSx = React.useMemo(() => ({ cursor: 'pointer' }), []);
    const chipSx = React.useMemo(() => ({
        textTransform: 'capitalize',
        '&:hover': {
            backgroundColor: isActive ? 'primary.dark' : 'action.hover',
        },
    }), [isActive]);
    return (<Badge badgeContent={messageCount} color={isActive ? 'primary' : 'default'} sx={badgeSx} onClick={handleClick}>
      <Chip label={messageType} variant={isActive ? 'filled' : 'outlined'} color={isActive ? 'primary' : 'default'} size={isSmall ? 'small' : 'medium'} onClick={handleClick} sx={chipSx}/>
    </Badge>);
});
//# sourceMappingURL=chat-message-filters.jsx.map