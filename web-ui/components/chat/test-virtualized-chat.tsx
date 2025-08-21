"use client";

import React from 'react';
import { VirtualizedChatDisplay } from './virtualized-chat-display';
import { ChatMessage, ChatTurn } from '@/lib/ai';

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
          "Absolutely! Here's how to handle long code blocks:\n\n```typescript\n// This is a very long code block that should wrap properly\n// and not cause horizontal overflow in the chat interface\nconst handleLongCodeBlocks = () => {\n  const containerStyles = {\n    maxWidth: '100%',\n    overflowX: 'auto',\n    wordBreak: 'break-word' as const,\n    whiteSpace: 'pre-wrap' as const,\n    fontFamily: 'monospace',\n    backgroundColor: '#f5f5f5',\n    padding: '12px',\n    borderRadius: '4px',\n    border: '1px solid #e0e0e0'\n  };\n  \n  // For virtualization, we need to estimate the height of code blocks\n  const estimateCodeBlockHeight = (codeContent: string, containerWidth: number) => {\n    const lines = codeContent.split('\\n').length;\n    const avgCharsPerLine = containerWidth / 8; // Rough monospace estimation\n    const wrappedLines = lines + Math.floor(codeContent.length / avgCharsPerLine);\n    return wrappedLines * 16; // 16px line height for code\n  };\n  \n  return containerStyles;\n};\n```\n\nKey points for handling code blocks:\n\n1. **Use `overflow: auto`** for horizontal scrolling when needed\n2. **Set `word-break: break-word`** for long identifiers\n3. **Use `white-space: pre-wrap`** to preserve formatting while allowing wrapping\n4. **Account for monospace font metrics** in height calculations\n5. **Add proper padding and borders** to height estimates",
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
          'Shorter version: Use overflow auto and proper word wrapping for code blocks.',
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
        optimizedContent: null,
      },
    ],
  },
] as unknown as Array<ChatTurn>;

export const TestVirtualizedChat: React.FC = () => {
  return (
    <div style={{ padding: '20px', height: '100vh' }}>
      <h1>Virtualized Chat Display Test</h1>
      <p>This component tests the improved virtualized chat display with various content types and sizes.</p>
      <VirtualizedChatDisplay turns={sampleTurns} height={600} />
    </div>
  );
};