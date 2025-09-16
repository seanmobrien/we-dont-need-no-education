## AI Middleware: Tool & Message Optimization (New)

The platform now includes a Tool Optimizing Middleware that performs two responsibilities in the model invocation pipeline:

- Dynamic tool registration ("tool scanning")
- Message history optimization via tool-aware summarization

### Features

- Automatic detection and registration of new function / provider-defined tools using a central `ToolMap`
- Optional message history compression once a configurable threshold is exceeded
- Backward compatibility with legacy `messages` arrays while using the new `prompt` (LanguageModelV2) structure
- OpenTelemetry metrics for: middleware invocations, tool scans, new tools discovered, optimization applied, durations
- Safe failure modes (errors log + fall back to original messages / tools)

### Configuration

```ts
interface ToolOptimizingMiddlewareConfig {
  userId?: string; // For metrics hashing
  chatHistoryId?: string; // For optimization context tracking
  enableMessageOptimization?: boolean; // default true
  optimizationThreshold?: number; // default 10 (minimum messages before optimizing)
  enableToolScanning?: boolean; // default true
}
```

### Heuristic for Optimization Input

When optimizing, the middleware may exclude an initial transient user message (without an `id`) so the summarizer only sees persistent chat history. It slices off the first element if ALL are true:

1. First prompt entry lacks `id` AND the second has an `id` (indicates new user turn prepended to stored history)
2. One of:
   - `enableToolScanning` was explicitly provided in config (any boolean)
   - The original `params.model` (before wrapped) was a string or `undefined`

Otherwise the full `prompt` (including the leading entry) is passed to the optimizer. Legacy arrays supplied via `messages` are never sliced—used verbatim for consistent historical behavior.

### Usage Example

```ts
import { createToolOptimizingMiddleware } from '@/lib/ai/middleware/tool-optimizing-middleware';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';

const toolOptimizing = createToolOptimizingMiddleware({
  userId: session.user.id,
  chatHistoryId: currentChatId,
  enableMessageOptimization: true,
  optimizationThreshold: 12,
  enableToolScanning: true,
});

// Wrap model (pseudo-code depending on your wrapper utility)
const model = aiModelFactory('hifi');
const result = await model.generate({
  prompt: buildPrompt(messages),
  tools,
  middleware: [toolOptimizing],
});
```

### Metrics Exported

Counters:

- `ai_tool_optimization_middleware_total`
- `ai_tool_scanning_total`
- `ai_message_optimization_enabled_total`

Histograms:

- `ai_tool_optimization_middleware_duration_ms`
- `ai_new_tools_found_count`

### Migration Notes

- Legacy callers passing `messages` continue to work; the middleware mirrors them into `prompt`.
- Provide `enableToolScanning` explicitly if you want the slicing heuristic applied in mixed contexts.
- Tests enforce structural identity when no optimization occurs—avoid mutating the original `params` unless an optimization result is produced.

### Failure Handling

- Tool scan failures: logged (source `ToolOptimizingMiddleware.toolScanning`), execution continues.
- Optimization failures: logged (source `ToolOptimizingMiddleware.messageOptimization`), original messages preserved.
- Critical wrapper failures: middleware returns untouched parameters for resilience.

### When to Disable Optimization

- Very short chats (set a higher `optimizationThreshold`)
- Deterministic replay / auditing scenarios
- During initial debugging of tool behaviors

### Future Enhancements (Planned)

- Token-based threshold instead of message count
- Adaptive re-summarization interval
- Per-tool usage stats influencing summarization detail
