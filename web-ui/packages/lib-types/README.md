# @compliance-theater/types

Shared TypeScript type definitions for AI and chat functionality across the compliance-theater application.

## Overview

This package contains centralized type definitions, type guards, and utility types used throughout the AI and chat features of the application. By extracting these types into a separate package, we ensure consistency and avoid duplication across the codebase.

## Structure

```
lib-types/
├── src/
│   ├── ai/
│   │   ├── core/           # Core AI types, unions, and guards
│   │   │   ├── types.ts    # Annotated message types
│   │   │   ├── unions.ts   # AI model and provider type unions
│   │   │   ├── guards.ts   # Type guard functions
│   │   │   └── chat-ids.ts # Chat ID generation utilities
│   │   └── chat/           # Chat-specific types
│   │       └── types.ts    # Chat history types (turns, messages)
│   └── index.ts            # Main package exports
```

## Usage

### Importing Core AI Types

```typescript
import { 
  AiModelType, 
  AiLanguageModelType,
  AiProviderType 
} from '@compliance-theater/types/ai/core';
```

### Importing Chat Types

```typescript
import { 
  ChatMessage,
  ChatTurn,
  ChatDetails,
  RetryErrorInfo
} from '@compliance-theater/types/ai/chat';
```

### Using Type Guards

```typescript
import { 
  isAiModelType,
  isAiLanguageModelType,
  isAnnotatedErrorMessage
} from '@compliance-theater/types/ai/core';
```

### Generating Chat IDs

```typescript
import { generateChatId, splitIds } from '@compliance-theater/types/ai/core';

const { id, seed } = generateChatId();
const [chatId, messageId] = splitIds('chat123:msg456');
```

## Development

### Building

```bash
yarn build
```

### Testing

```bash
yarn test
```

### Linting

```bash
yarn lint
```

## Dependencies

- `@compliance-theater/logger` - Logging utilities
- `@compliance-theater/react` - React utility functions (for crypto-random-bytes)
- `ai` - Vercel AI SDK types
- `ts-pattern` - Pattern matching for type guards
