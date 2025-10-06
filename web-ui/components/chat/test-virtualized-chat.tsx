'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Badge,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
  Button,
} from '@mui/material';
import { FilterList } from '@mui/icons-material';
import { VirtualizedChatDisplay } from './virtualized-chat-display';
import { ChatMessage, ChatTurn } from '/lib/ai';

// Sample data for testing the virtualized chat display
const sampleTurns = [
  {
    turnId: 1,
    createdAt: '2024-01-01T10:00:00Z',
    completedAt: '2024-01-01T10:00:05Z',
    modelName: 'gpt-4',
    statusId: 1,
    temperature: 0.7,
    topP: 1.0,
    latencyMs: 5000,
    warnings: [
      'This is a warning message that could be quite long and should wrap properly without being cut off',
    ],
    errors: null,
    metadata: {
      tokens: 150,
      cost: 0.03,
      model_version: '2024-01-01',
    },
    messages: [
      {
        turnId: 1,
        messageId: 0,
        role: 'system',
        content:
          'You are a helpful assistant specializing in React development and virtualization techniques.',
        messageOrder: 0,
        toolName: null,
        functionCall: null,
        statusId: 1,
        providerId: 'system',
        metadata: {
          timestamp: '2024-01-01T09:59:58Z',
        },
        toolInstanceId: null,
        optimizedContent: null,
      },
      {
        turnId: 1,
        messageId: 1,
        role: 'user',
        content:
          "Hello! Can you help me understand how React virtualization works? I'm particularly interested in:\n\n1. How to estimate item heights accurately\n2. Dynamic resizing when content changes\n3. Handling variable content sizes\n\nI have some complex markdown content that includes:\n\n```javascript\nconst example = {\n  virtualizer: useVirtualizer({\n    count: items.length,\n    getScrollElement: () => parentRef.current,\n    estimateSize: (index) => {\n      // Complex estimation logic here\n      return calculateHeight(items[index]);\n    },\n    overscan: 5\n  })\n};\n```\n\nAnd also some longer text that should wrap properly and not get cut off at arbitrary boundaries. This is important for chat interfaces where messages can vary significantly in length.",
        messageOrder: 1,
        toolName: null,
        functionCall: null,
        statusId: 1,
        providerId: 'user',
        metadata: {
          timestamp: '2024-01-01T10:00:00Z',
        },
        toolInstanceId: null,
        optimizedContent: null,
      },
      {
        turnId: 1,
        messageId: 2,
        role: 'assistant',
        content:
          "# React Virtualization Guide\n\nGreat question! Let me break down React virtualization for you:\n\n## 1. Accurate Height Estimation\n\nThe key to good virtualization is accurate height estimation. Here are the main approaches:\n\n### Static Heights\n```typescript\nconst estimateSize = () => 100; // Fixed height\n```\n\n### Dynamic Heights\n```typescript\nconst estimateSize = (index: number) => {\n  const item = items[index];\n  if (item.type === 'text') {\n    return Math.max(item.content.length / 50 * 20, 40);\n  }\n  return 100;\n};\n```\n\n### Canvas-based Measurement\n```typescript\nconst textMeasurer = createTextMeasurer();\nconst estimateSize = (index: number) => {\n  const item = items[index];\n  return textMeasurer.calculateWrappedHeight(\n    item.content,\n    containerWidth,\n    14, // font size\n    'Roboto' // font family\n  );\n};\n```\n\n## 2. Dynamic Resizing\n\nFor content that changes size after rendering:\n\n```typescript\nconst rowVirtualizer = useVirtualizer({\n  count: items.length,\n  getScrollElement: () => parentRef.current,\n  estimateSize,\n  measureElement: (element) => element?.getBoundingClientRect().height,\n  overscan: 5\n});\n```\n\n## 3. Variable Content Handling\n\n- **Remove artificial height caps** that truncate content\n- **Use sophisticated measurement** for markdown/rich text\n- **Enable dynamic measurement** with ResizeObserver\n- **Account for padding and margins** in calculations\n\n## Best Practices\n\n1. **Conservative estimation**: Better to overestimate than underestimate\n2. **Incremental improvements**: Start simple, add sophistication\n3. **Performance monitoring**: Watch for scroll jank\n4. **Content-aware sizing**: Different types need different calculations\n\n### Example Implementation\n\n```typescript\nconst estimateSize = useCallback((index: number) => {\n  const item = items[index];\n  let height = 60; // Base height\n  \n  if (item.content) {\n    height += estimateMarkdownHeight(\n      item.content,\n      containerWidth * 0.9,\n      textMeasurer\n    );\n  }\n  \n  // Add padding and margins\n  height += 32;\n  \n  // No artificial caps!\n  return Math.max(height, 80);\n}, [items, containerWidth]);\n```\n\nThis approach ensures content is never cut off and provides smooth scrolling even with highly variable content sizes.",
        messageOrder: 2,
        toolName: null,
        functionCall: null,
        statusId: 1,
        providerId: 'openai',
        metadata: {
          timestamp: '2024-01-01T10:00:05Z',
          tokens_used: 150,
          model: 'gpt-4',
        },
        toolInstanceId: null,
        optimizedContent: null,
      },
    ],
  },
  {
    turnId: 2,
    createdAt: '2024-01-01T10:01:00Z',
    completedAt: '2024-01-01T10:01:03Z',
    modelName: 'gpt-4',
    statusId: 1,
    temperature: 0.7,
    topP: 1.0,
    latencyMs: 3000,
    warnings: null,
    errors: ['Connection timeout occurred', 'Retry attempt failed'],
    metadata: {
      tokens: 75,
      cost: 0.015,
      retry_count: 2,
    },
    messages: [
      {
        turnId: 2,
        messageId: 3,
        role: 'user',
        content:
          'Thanks for the detailed explanation! Can you also show me how to handle really long code blocks that might overflow?',
        messageOrder: 1,
        toolName: null,
        functionCall: null,
        statusId: 1,
        providerId: 'user',
        metadata: {
          timestamp: '2024-01-01T10:01:00Z',
        },
        toolInstanceId: null,
        optimizedContent: null,
      },
      {
        turnId: 2,
        messageId: 4,
        role: 'assistant',
        content:
          "Absolutely! Here's how to handle long code blocks:\n\n```typescript\n// This is a very long code block that should wrap properly\n// and not cause horizontal overflow in the chat interface\nconst handleLongCodeBlocks = () => {\n  const containerStyles = {\n    maxWidth: '100%',\n    overflowX: 'auto',\n    wordBreak: 'break-word' as const,\n    whiteSpace: 'pre-wrap' as const,\n    fontFamily: 'monospace',\n    backgroundColor: '#f5f5f5',\n    padding: '12px',\n    borderRadius: '4px',\n    border: '1px solid #e0e0e0'\n  };\n  \n  // For virtualization, we need to estimate the height of code blocks\n  const estimateCodeBlockHeight = (codeContent: string, containerWidth: number) => {\n    const lines = codeContent.split('\\n').length;\n    const avgCharsPerLine = containerWidth / 8; // Rough monospace estimation\n    const wrappedLines = lines + Math.floor(codeContent.length / avgCharsPerLine);\n    return wrappedLines * 16; // 16px line height for code\n  };\n  \n  return containerStyles;\n};\n```\n\nLet me use a tool to estimate the code block height for you.",
        messageOrder: 2,
        toolName: null,
        functionCall: {
          name: 'estimate_code_height',
          arguments: {
            code: 'const example = "very long code";',
            width: 400,
          },
        },
        statusId: 1,
        providerId: 'openai',
        metadata: {
          timestamp: '2024-01-01T10:01:03Z',
          tokens_used: 200,
          model: 'gpt-4',
          function_call_duration: 150,
        },
        toolInstanceId: 'tool_123',
        optimizedContent:
          '**Optimized Summary for CSS Overflow Issues:**\n\n1. **Root Cause**: Content containers lack proper overflow handling\n2. **Quick Fix**: Add `overflow: auto` and `word-wrap: break-word`\n3. **Implementation**:\n```css\n.container {\n  overflow: auto;\n  word-wrap: break-word;\n  max-width: 100%;\n}\n```\n\n4. **Additional Considerations**:\n   - Use `white-space: pre-wrap` for preserved formatting\n   - Consider `overflow-wrap: break-word` for modern browsers\n   - Test with long URLs and code snippets\n\n5. **Testing**: Verify with content exceeding container width\n\nThis addresses the core issue while maintaining readability and responsive design.',
      },
      {
        turnId: 2,
        messageId: 5,
        role: 'tool',
        content:
          'Code block height estimated at 240px based on content length and container width.',
        messageOrder: 3,
        toolName: 'estimate_code_height',
        functionCall: null,
        statusId: 1,
        providerId: 'tool',
        metadata: {
          timestamp: '2024-01-01T10:01:03Z',
          tool_execution_time: 45,
          result: {
            estimated_height: 240,
            line_count: 15,
            wrapped_lines: 18,
          },
        },
        toolInstanceId: 'tool_123',
        optimizedContent: null,
      },
    ] as unknown as Array<ChatMessage>,
  },
  {
    turnId: 3,
    createdAt: '2024-01-01T10:02:00Z',
    completedAt: null,
    modelName: 'gpt-4',
    statusId: 0,
    temperature: 0.7,
    topP: 1.0,
    latencyMs: null,
    warnings: null,
    errors: null,
    metadata: null,
    messages: [
      {
        turnId: 3,
        messageId: 5,
        role: 'user',
        content: 'This is a really short message.',
        messageOrder: 1,
        toolName: null,
        functionCall: null,
        statusId: 1,
        providerId: 'user',
        metadata: {
          timestamp: '2024-01-01T10:02:00Z',
        },
        toolInstanceId: null,
        optimizedContent: 'Short user query about viewport bugs.',
      },
    ],
  },
] as unknown as Array<ChatTurn>;

// Available message types for filtering
const MESSAGE_TYPES = ['user', 'assistant', 'system', 'tool'] as const;
type MessageType = (typeof MESSAGE_TYPES)[number];

// Filter mode: 'single-turn' filters within turns, 'entire-chat' filters entire turns
type FilterMode = 'single-turn' | 'entire-chat';

export const TestVirtualizedChat: React.FC = () => {
  // Filter state
  const [enableFilters, setEnableFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<MessageType>>(
    new Set(),
  );
  const [filterMode, setFilterMode] = useState<FilterMode>('single-turn');

  // Filter handling functions
  const toggleFilter = (messageType: MessageType) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(messageType)) {
      newFilters.delete(messageType);
    } else {
      newFilters.add(messageType);
    }
    setActiveFilters(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters(new Set());
  };

  // Apply filters to the chat data
  const filteredTurns = useMemo(() => {
    if (!enableFilters || activeFilters.size === 0) {
      return sampleTurns;
    }

    if (filterMode === 'entire-chat') {
      // Filter entire turns: hide turns that don't contain any matching messages
      return sampleTurns.filter((turn) =>
        turn.messages.some((message) =>
          activeFilters.has(message.role as MessageType),
        ),
      );
    } else {
      // Filter within turns: hide individual messages but keep turns
      return sampleTurns
        .map((turn) => ({
          ...turn,
          messages: turn.messages.filter((message) =>
            activeFilters.has(message.role as MessageType),
          ),
        }))
        .filter((turn) => turn.messages.length > 0); // Remove turns with no messages after filtering
    }
  }, [enableFilters, activeFilters, filterMode]);

  // Get available message types from the current chat
  const availableTypes = useMemo(() => {
    const typesInChat = new Set<MessageType>();
    sampleTurns.forEach((turn) => {
      turn.messages.forEach((message) => {
        if (MESSAGE_TYPES.includes(message.role as MessageType)) {
          typesInChat.add(message.role as MessageType);
        }
      });
    });
    return Array.from(typesInChat).sort();
  }, []);

  return (
    <div style={{ padding: '20px', height: '100vh' }}>
      <Typography variant="h4" gutterBottom>
        Virtualized Chat Display with Message Filtering
      </Typography>
      <Typography variant="body1" gutterBottom>
        This component demonstrates the message filtering functionality with MUI
        badges.
      </Typography>

      {/* Message Filtering Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FilterList color="action" />
          <Typography variant="h6">Message Filters</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={enableFilters}
                onChange={(e) => {
                  setEnableFilters(e.target.checked);
                  if (!e.target.checked) {
                    clearAllFilters();
                  }
                }}
              />
            }
            label="Enable Filtering"
          />
        </Box>

        {enableFilters && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Filter Mode:
              </Typography>
              <ToggleButtonGroup
                value={filterMode}
                exclusive
                onChange={(_, newMode) => newMode && setFilterMode(newMode)}
                size="small"
              >
                <ToggleButton value="single-turn">Single Turn</ToggleButton>
                <ToggleButton value="entire-chat">Entire Chat</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Show messages of type:
              </Typography>
              {availableTypes.map((messageType) => {
                const isActive = activeFilters.has(messageType);
                const messageCount = sampleTurns.reduce(
                  (count, turn) =>
                    count +
                    turn.messages.filter((msg) => msg.role === messageType)
                      .length,
                  0,
                );

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
                      onClick={() => toggleFilter(messageType)}
                      sx={{
                        textTransform: 'capitalize',
                        '&:hover': {
                          backgroundColor: isActive
                            ? 'primary.dark'
                            : 'action.hover',
                        },
                      }}
                    />
                  </Badge>
                );
              })}

              {activeFilters.size > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={clearAllFilters}
                  sx={{ ml: 1 }}
                >
                  Clear All
                </Button>
              )}
            </Box>

            {activeFilters.size > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {activeFilters.size} of {availableTypes.length}{' '}
                  message types
                  {filterMode === 'entire-chat'
                    ? ' (hiding entire turns without matching messages)'
                    : ' (hiding individual messages)'}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>

      {filteredTurns.length === 0 ? (
        <Typography color="text.secondary">
          No messages match the current filters.
        </Typography>
      ) : (
        <VirtualizedChatDisplay turns={filteredTurns} height={600} />
      )}
    </div>
  );
};
