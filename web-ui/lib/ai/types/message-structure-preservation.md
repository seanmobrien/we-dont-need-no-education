# Message Structure Preservation Interface

This module provides a strongly-typed interface to replace the `__preserveStructure` magic property with a comprehensive, type-safe message structure preservation system.

## Overview

The `MessageStructureOptions` interface provides:

- **Type Safety**: Replace runtime magic properties with compile-time type checking
- **Comprehensive Configuration**: Fine-grained control over message preservation
- **Performance Optimization**: Built-in caching and performance options
- **Flexible Strategies**: Multiple preservation strategies for different use cases
- **Extensibility**: Custom validators and transformation functions

## Basic Usage

### Simple Configuration

```typescript
import { preserveMessageStructure, createMessageStructureOptions } from '@/lib/ai/utils/message-structure-preservation';
import type { MessageStructureOptions } from '@/lib/ai/types/message-structure-preservation';

// Basic preservation with defaults
const messages: UIMessage[] = [...];
const result = preserveMessageStructure(messages);

console.log(`Preserved ${result.stats.preservedCount} out of ${result.stats.originalCount} messages`);
```

### Custom Configuration

```typescript
const options: MessageStructureOptions = {
  strategy: 'semantic',
  partRules: {
    text: true,
    toolCall: true,
    toolResult: false,
    file: false,
  },
  contextual: {
    recentInteractionCount: 5,
    preserveKeywords: ['important', 'error', 'warning'],
  },
  performance: {
    enableCaching: true,
    cacheTtlMs: 300000,
  },
  debug: true,
};

const result = preserveMessageStructure(messages, options);
```

## Preservation Strategies

### 1. Full Preservation (`'full'`)

Preserves all messages with complete structure and metadata.

```typescript
const result = preserveMessageStructure(messages, { 
  strategy: 'full' 
});
// All messages preserved as-is
```

### 2. Content-Only Preservation (`'content-only'`)

Preserves only messages with text content, filters out tool calls and other parts.

```typescript
const result = preserveMessageStructure(messages, { 
  strategy: 'content-only' 
});
// Only messages with text parts are preserved
```

### 3. Minimal Preservation (`'minimal'`)

Preserves only essential messages (text and tool calls).

```typescript
const result = preserveMessageStructure(messages, { 
  strategy: 'minimal' 
});
// Only messages with text or tool-call parts
```

### 4. Semantic Preservation (`'semantic'`)

Uses contextual rules to intelligently preserve messages.

```typescript
const result = preserveMessageStructure(messages, {
  strategy: 'semantic',
  contextual: {
    recentInteractionCount: 3,
    preserveKeywords: ['error', 'important'],
    preservePatterns: [/WARNING:/, /ERROR:/],
  },
});
```

### 5. Custom Preservation (`'custom'`)

Uses custom validation logic.

```typescript
const result = preserveMessageStructure(messages, {
  strategy: 'custom',
  validator: (message) => {
    // Custom logic to determine if message should be preserved
    return message.role === 'user' || 
           message.parts.some(part => 
             part.type === 'text' && 
             part.text.includes('important')
           );
  },
});
```

## Contextual Preservation

### Recent Interactions

Preserve the last N interactions:

```typescript
const options = {
  strategy: 'semantic',
  contextual: {
    recentInteractionCount: 5, // Preserve last 5 messages
  },
};
```

### Keyword-Based Preservation

Preserve messages containing specific keywords:

```typescript
const options = {
  strategy: 'semantic',
  contextual: {
    preserveKeywords: ['error', 'warning', 'important', 'urgent'],
  },
};
```

### Pattern-Based Preservation

Preserve messages matching regular expressions:

```typescript
const options = {
  strategy: 'semantic',
  contextual: {
    preservePatterns: [
      /ERROR:/i,
      /WARNING:/i,
      /\[IMPORTANT\]/i,
    ],
  },
};
```

### Custom Context Evaluator

Use custom logic to evaluate preservation based on message context:

```typescript
const options = {
  strategy: 'semantic',
  contextual: {
    contextEvaluator: (message, index, messages) => {
      // Preserve system messages
      if (message.role === 'system') return true;
      
      // Preserve messages that reference previous errors
      const hasErrorReference = message.parts.some(part =>
        part.type === 'text' && 
        /refer|mentioned|error|issue/.test(part.text)
      );
      
      return hasErrorReference;
    },
  },
};
```

## Content Transformation

### Text Truncation

Limit content length and add truncation indicators:

```typescript
const options = {
  contentTransformation: {
    maxContentLength: 500,
    truncateContent: true,
    truncationSuffix: '... [truncated]',
  },
};
```

### Custom Content Transformation

Apply custom transformations to message content:

```typescript
const options = {
  contentTransformation: {
    contentTransformer: (text) => {
      // Remove sensitive information
      return text
        .replace(/password:\s*\S+/gi, 'password: [REDACTED]')
        .replace(/api[_-]?key:\s*\S+/gi, 'api_key: [REDACTED]');
    },
  },
};
```

## Part Filtering

Control which message parts are preserved:

```typescript
const options = {
  partRules: {
    text: true,           // Preserve text content
    toolCall: true,       // Preserve tool calls
    toolResult: false,    // Filter out tool results
    file: false,          // Filter out file attachments
    image: false,         // Filter out images
    dynamic: false,       // Filter out dynamic/unknown parts
  },
};
```

## Performance Optimization

### Caching

Enable caching to improve performance for repeated operations:

```typescript
const options = {
  performance: {
    enableCaching: true,
    cacheTtlMs: 600000,    // 10 minutes
    maxCacheSize: 1000,    // Maximum cache entries
  },
};
```

### Async Processing

For large message sets, enable async processing:

```typescript
const options = {
  performance: {
    enableAsyncProcessing: true,
  },
};
```

## Preset Configurations

Use predefined configurations for common scenarios:

```typescript
import { createPresetConfiguration } from '@/lib/ai/utils/message-structure-preservation';

// Minimal configuration for basic text preservation
const minimalConfig = createPresetConfiguration('minimal');

// Balanced configuration for general use
const balancedConfig = createPresetConfiguration('balanced');

// Comprehensive configuration with full features
const comprehensiveConfig = createPresetConfiguration('comprehensive');

// Performance-optimized configuration
const performanceConfig = createPresetConfiguration('performance');
```

## Debug Information

Enable debug mode to get detailed information about preservation decisions:

```typescript
const result = preserveMessageStructure(messages, { 
  debug: true 
});

if (result.debugInfo) {
  result.debugInfo.decisions.forEach(decision => {
    console.log(`Message ${decision.messageId}: ${decision.preserved ? 'KEPT' : 'FILTERED'} - ${decision.reason}`);
  });
}
```

## Error Handling

The system gracefully handles errors and provides warnings:

```typescript
const result = preserveMessageStructure(messages, options);

// Check for warnings
if (result.warnings?.length) {
  console.warn('Preservation warnings:', result.warnings);
}

// Check for processing errors
if (result.debugInfo?.decisions.some(d => d.reason.includes('Error'))) {
  console.warn('Some messages had processing errors');
}
```

## Validation

Validate your configuration before use:

```typescript
import { validateMessageStructureOptions } from '@/lib/ai/utils/message-structure-preservation';

const options = {
  strategy: 'invalid-strategy', // This will cause validation to fail
  performance: {
    cacheTtlMs: -1, // This will also fail
  },
};

const validation = validateMessageStructureOptions(options);

if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
```

## Cache Management

Monitor and manage the preservation cache:

```typescript
import { 
  getPreservationCacheStats,
  clearPreservationCache 
} from '@/lib/ai/utils/message-structure-preservation';

// Get cache statistics
const stats = getPreservationCacheStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);

// Clear cache when needed
clearPreservationCache();
```

## Migration from Magic Properties

### Before (with magic properties)

```typescript
// Old approach with magic property
const messageWithMagic = {
  ...message,
  __preserveStructure: true,  // Magic property
};

// No type safety, no configuration options
```

### After (with typed interface)

```typescript
// New approach with typed interface
const preservationOptions: MessageStructureOptions = {
  enabled: true,
  strategy: 'semantic',
  partRules: {
    text: true,
    toolCall: true,
  },
  contextual: {
    recentInteractionCount: 5,
  },
  debug: true,
};

const result = preserveMessageStructure(messages, preservationOptions);

// Full type safety, comprehensive configuration, detailed feedback
```

## Best Practices

1. **Start Simple**: Begin with preset configurations and customize as needed
2. **Use Validation**: Always validate your configuration in development
3. **Enable Debug Mode**: Use debug mode during development to understand preservation decisions
4. **Monitor Performance**: Use cache statistics to optimize performance
5. **Handle Errors**: Check for warnings and handle them appropriately
6. **Test Thoroughly**: Test your preservation logic with various message types and scenarios

## Integration Examples

### With Message Optimizer

```typescript
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';

// First apply structure preservation, then optimization
const preserved = preserveMessageStructure(messages, {
  strategy: 'semantic',
  contextual: { recentInteractionCount: 10 },
});

const optimized = await optimizeMessagesWithToolSummarization(
  preserved.preserved,
  modelName,
  userId,
  chatId
);
```

### With Chat History Middleware

```typescript
// Add preservation options to middleware configuration
const chatHistoryContext = createUserChatHistoryContext({
  userId,
  requestId: chatHistoryId,
  chatId: threadId,
  model,
  messageStructure: createPresetConfiguration('balanced'),
});
```