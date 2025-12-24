
import type {
  LanguageModelV2StreamPart,
  LanguageModelV2ToolResultPart,
  LanguageModelV2ToolCall,
} from '@ai-sdk/provider';
import type { StreamHandlerContext, StreamHandlerResult } from './types';
import { instrumentStreamChunk } from './instrumentation';
import { ensureCreateResult } from './stream-handler-result';

// ---------------------------------------------------------------------------
// Lightweight per-id buffers for explicit streaming types
// ---------------------------------------------------------------------------
const OPEN_TEXT_SYM = Symbol.for('chat-history.openTextBuffers');
const OPEN_REASONING_SYM = Symbol.for('chat-history.openReasoningBuffers');
const OPEN_TOOL_INPUT_SYM = Symbol.for('chat-history.openToolInputBuffers');

type ToolInputBuffer = { toolName?: string; value: string };

function getOpenText(context: StreamHandlerContext): Map<string, string> {
  const bag = context as unknown as Record<PropertyKey, unknown>;
  if (!bag[OPEN_TEXT_SYM]) {
    bag[OPEN_TEXT_SYM] = new Map<string, string>();
  }
  return bag[OPEN_TEXT_SYM] as Map<string, string>;
}

function getOpenReasoning(context: StreamHandlerContext): Map<string, string> {
  const bag = context as unknown as Record<PropertyKey, unknown>;
  if (!bag[OPEN_REASONING_SYM]) {
    bag[OPEN_REASONING_SYM] = new Map<string, string>();
  }
  return bag[OPEN_REASONING_SYM] as Map<string, string>;
}

function getOpenToolInput(
  context: StreamHandlerContext,
): Map<string, ToolInputBuffer> {
  const bag = context as unknown as Record<PropertyKey, unknown>;
  if (!bag[OPEN_TOOL_INPUT_SYM]) {
    bag[OPEN_TOOL_INPUT_SYM] = new Map<string, ToolInputBuffer>();
  }
  return bag[OPEN_TOOL_INPUT_SYM] as Map<string, ToolInputBuffer>;
}

export abstract class StreamProcessor<
  TContext extends StreamHandlerContext = StreamHandlerContext
> {
  protected abstract processToolCall(
    chunk: Extract<LanguageModelV2ToolCall, { type: 'tool-call' }>,
    context: TContext
  ): Promise<StreamHandlerResult>;

  protected abstract processToolResult(
    chunk: LanguageModelV2ToolResultPart,
    context: TContext
  ): Promise<StreamHandlerResult>;

  protected abstract processFinish(
    chunk: Extract<LanguageModelV2StreamPart, { type: 'finish' }>,
    context: TContext
  ): Promise<StreamHandlerResult>;

  protected abstract processError(
    chunk: Extract<LanguageModelV2StreamPart, { type: 'error' }>,
    context: TContext
  ): Promise<StreamHandlerResult>;

  protected abstract processMetadata(
    chunk: LanguageModelV2StreamPart,
    context: TContext
  ): Promise<StreamHandlerResult>;

  protected abstract processOther(
    chunk: LanguageModelV2StreamPart,
    context: TContext
  ): Promise<StreamHandlerResult>;

  public async process(
    chunk: LanguageModelV2StreamPart | LanguageModelV2ToolResultPart,
    context: TContext,
  ): Promise<StreamHandlerResult> {
    ensureCreateResult(context);
    return await instrumentStreamChunk(chunk.type, context, async () => {
      switch (chunk.type) {
        // ----- Text parts -----
        case 'text-start': {
          const { id } = chunk as Extract<
            LanguageModelV2StreamPart,
            { type: 'text-start' }
          >;
          getOpenText(context).set(id, '');
          return context.createResult(true);
        }
        case 'text-delta': {
          const { id, delta } = chunk as Extract<
            LanguageModelV2StreamPart,
            { type: 'text-delta' }
          >;
          const map = getOpenText(context);
          if (!map.has(id)) map.set(id, '');
          map.set(id, (map.get(id) || '') + delta);
          context.generatedText = (context.generatedText || '') + delta;
          return context.createResult({
            generatedText: context.generatedText,
          });
        }
        case 'text-end': {
          const { id } = chunk as Extract<
            LanguageModelV2StreamPart,
            { type: 'text-end' }
          >;
          const map = getOpenText(context);
          const text = map.get(id) || '';
          map.delete(id);
          if (text) context.generatedJSON.push({ type: 'text', text });
          return context.createResult(true);
        }

        // ----- Reasoning parts -----
        case 'reasoning-start': {
          const { id } = chunk as Extract<
            LanguageModelV2StreamPart,
            { type: 'reasoning-start' }
          >;
          getOpenReasoning(context).set(id, '');
          return context.createResult(true);
        }
        case 'reasoning-delta': {
          const { id, delta } = chunk as Extract<
            LanguageModelV2StreamPart,
            { type: 'reasoning-delta' }
          >;
          const map = getOpenReasoning(context);
          if (!map.has(id)) map.set(id, '');
          map.set(id, (map.get(id) || '') + delta);
          return context.createResult(true);
        }
        case 'reasoning-end': {
          const { id } = chunk as Extract<
            LanguageModelV2StreamPart,
            { type: 'reasoning-end' }
          >;
          const map = getOpenReasoning(context);
          const text = map.get(id) || '';
          map.delete(id);
          if (text) context.generatedJSON.push({ type: 'reasoning', text });
          return context.createResult(true);
        }

        // ----- Tool input (pre tool-call) -----
        case 'tool-input-start': {
          const { id, toolName } = chunk as Extract<
            LanguageModelV2StreamPart,
            { type: 'tool-input-start' }
          >;
          getOpenToolInput(context).set(id, { toolName, value: '' });
          return context.createResult(true);
        }
        case 'tool-input-delta': {
          const { id, delta } = chunk as Extract<
            LanguageModelV2StreamPart,
            { type: 'tool-input-delta' }
          >;
          const map = getOpenToolInput(context);
          const buf = map.get(id) || { value: '' };
          buf.value = (buf.value || '') + delta;
          map.set(id, buf);
          return context.createResult(true);
        }
        case 'tool-input-end': {
          const { id } = chunk as Extract<
            LanguageModelV2StreamPart,
            { type: 'tool-input-end' }
          >;
          const map = getOpenToolInput(context);
          const buf = map.get(id);
          if (buf) {
            const t = (buf.value ?? '').trim();
            if (t.length > 0) {
              let input: unknown = buf.value;
              if (
                (t.startsWith('{') && t.endsWith('}')) ||
                (t.startsWith('[') && t.endsWith(']'))
              ) {
                try {
                  input = JSON.parse(buf.value);
                } catch {
                  /* keep raw */
                }
              }
              context.generatedJSON.push({
                type: 'tool-input',
                id,
                ...(buf.toolName ? { toolName: buf.toolName } : {}),
                input,
              });
            }
            map.delete(id);
          }
          return context.createResult(true);
        }

        case 'tool-call':
          return await this.processToolCall(chunk, context);

        case 'tool-result':
          if ('output' in chunk) {
            return await this.processToolResult(chunk, context);
          }
          // We have a tool result without output, so we create an empty content output for it.
          return await this.processToolResult({
            ...chunk,
            output: {
              type: 'content',
              value: [] as Array<{
                type: 'text';
                text: string;
              }>
            }
          }, context);
        case 'finish':
          return await this.processFinish(chunk, context);

        case 'error':
          return await this.processError(chunk, context);

        case 'file':
        case 'source':
        case 'raw':
        case 'response-metadata':
        case 'stream-start':
          return await this.processMetadata(chunk, context);

        default:
          return await this.processOther(chunk, context);
      }
    });
  }
}
