# AI SDK v5 Migration Plan

## Current Implementation vs V5 Changes

### 1. Package Updates

```bash
# Current
"ai": "^4.3.16"

# V5 Target
"ai": "^5.0.0-alpha"
```

### 2. Import Changes

```typescript
// Current
import { createDataStreamResponse, streamText, UIMessage } from 'ai';

// V5
import { streamText, convertToModelMessages, UIMessage } from 'ai';
```

### 3. Type Changes

```typescript
// Current
const {
  messages,
  data: { model: modelFromRequest, threadId, writeEnabled = false } = {},
} = ((await req.json()) as ChatRequestMessage) ?? {};

// V5
const {
  messages,
  data: { model: modelFromRequest, threadId, writeEnabled = false } = {},
}: {
  messages: UIMessage[];
  data?: { model?: string; threadId?: string; writeEnabled?: boolean };
} = await req.json();
```

### 4. Message Processing

```typescript
// Current (with custom pruning)
const optimizedMessages = pruneCompletedToolCalls(messages);

const result = streamText({
  model: aiModelFactory(model),
  messages: optimizedMessages,
  // ... other options
});

// V5 (automatic optimization)
const result = streamText({
  model: aiModelFactory(model),
  messages: convertToModelMessages(messages), // Built-in optimization!
  // ... other options
});
```

### 5. Response Pattern

```typescript
// Current
return createDataStreamResponse({
  execute: (dataStream) => {
    const result = streamText({...});
    result.mergeIntoDataStream(dataStream);
  },
  onError: (error) => {
    // error handling
  },
});

// V5
const result = streamText({...});
return result.toUIMessageStreamResponse({
  onError: (error) => {
    // error handling
  },
});
```

## Migration Complexity Assessment

### 🟢 LOW RISK (Easy to migrate)

- **Core logic**: Tool providers, authentication, logging remain unchanged
- **Error handling**: Similar patterns, just different API
- **Database operations**: No changes needed
- **Business logic**: Rate limiting, user management unchanged

### 🟡 MEDIUM RISK (Requires attention)

- **Type compatibility**: Need to ensure `UIMessage` works with existing `ChatRequestMessage`
- **Response format**: Frontend might expect specific response structure
- **Tool call handling**: Need to verify MCP tools work with v5 message format
- **Metadata handling**: onFinish callback structure might change

### 🔴 HIGH RISK (Needs careful testing)

- **Stream handling**: Different streaming protocol (SSE vs custom)
- **Frontend compatibility**: useChat hook might need updates
- **Tool result processing**: Tool invocation/result format changes
- **Custom data streaming**: dataStream.writeData patterns might change

## Step-by-Step Migration Plan

### Phase 1: Preparation (Low Risk)

1. **Create feature branch**: `git checkout -b ai-sdk-v5-migration`
2. **Update package.json**: Install AI SDK v5 alpha
3. **Run tests**: Ensure current implementation works before changes

### Phase 2: Backend Migration (Medium Risk)

1. **Update imports**: Change to v5 import patterns
2. **Update types**: Replace `ChatRequestMessage['messages']` with `UIMessage[]`
3. **Replace response pattern**: Use `toUIMessageStreamResponse()`
4. **Remove custom pruning**: Replace with `convertToModelMessages()`
5. **Test API endpoints**: Verify responses work correctly

### Phase 3: Frontend Updates (High Risk)

1. **Update useChat**: Ensure client-side hooks work with new format
2. **Test tool interactions**: Verify MCP tools work correctly
3. **Test streaming**: Ensure UI updates work with SSE protocol
4. **Verify metadata**: Check that custom data still reaches frontend

### Phase 4: Validation (Critical)

1. **Integration testing**: Full chat flow with tools
2. **Performance testing**: Compare token usage and response times
3. **Error handling**: Test rate limits, network failures
4. **Load testing**: Ensure SSE handles concurrent users

## Code Examples

### Current Implementation (Simplified)

```typescript
export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as ChatRequestMessage;
  const optimizedMessages = pruneCompletedToolCalls(messages);

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: aiModelFactory(model),
        messages: optimizedMessages,
        tools: toolProviders.get_tools(),
      });
      result.mergeIntoDataStream(dataStream);
    },
  });
}
```

### V5 Target Implementation

```typescript
export async function POST(req: NextRequest) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: aiModelFactory(model),
    messages: convertToModelMessages(messages), // Automatic pruning!
    tools: toolProviders.get_tools(),
  });

  return result.toUIMessageStreamResponse();
}
```

## Benefits of Migration

### Immediate Benefits

- **Automatic context optimization**: No more custom pruning logic
- **Better type safety**: UIMessage/ModelMessage separation
- **Improved performance**: Built-in SSE protocol
- **Enhanced metadata**: Rich message metadata support

### Long-term Benefits

- **Future-proof**: Built for modern AI capabilities
- **Better tooling**: Enhanced debugging and monitoring
- **Extensibility**: Easier to add new AI features
- **Community support**: Latest SDK with active development

## Recommended Timeline

- **Week 1**: Phase 1 (Preparation) + Backend migration
- **Week 2**: Frontend updates + initial testing
- **Week 3**: Integration testing + bug fixes
- **Week 4**: Performance testing + production deployment

## Risk Mitigation

1. **Feature flagging**: Use environment variable to toggle between v4/v5
2. **Gradual rollout**: Test with limited users first
3. **Rollback plan**: Keep v4 implementation for quick revert
4. **Monitoring**: Enhanced logging during migration period
5. **Staging environment**: Full testing before production

## Conclusion

Migration difficulty: **6/10** - Moderate complexity, manageable with proper planning.

The migration is **definitely worthwhile** because:

- Eliminates custom pruning code (60+ lines removed)
- Better performance with automatic optimization
- Future-proof architecture
- Enhanced debugging capabilities

Most complexity comes from ensuring frontend compatibility and testing edge cases, not the core API migration itself.
