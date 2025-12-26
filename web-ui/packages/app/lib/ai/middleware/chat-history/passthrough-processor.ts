
import type { StreamHandlerContext, StreamHandlerResult } from './types';
import { StreamProcessor } from './stream-processor';
import type {
  LanguageModelV2StreamPart,
  LanguageModelV2ToolResultPart,
  LanguageModelV2ToolCall,
} from '@ai-sdk/provider';
import { ensureCreateResult } from './stream-handler-result';

export class PassthroughStreamProcessor extends StreamProcessor<StreamHandlerContext> {
  protected async processToolCall(
    chunk: Extract<LanguageModelV2ToolCall, { type: 'tool-call' }>,
    context: StreamHandlerContext
  ): Promise<StreamHandlerResult> {
    ensureCreateResult(context);
    context.generatedJSON.push(chunk);
    return context.createResult(true);
  }

  protected async processToolResult(
    chunk: LanguageModelV2ToolResultPart,
    context: StreamHandlerContext
  ): Promise<StreamHandlerResult> {
    ensureCreateResult(context);
    context.generatedJSON.push(chunk as object as Record<string, unknown>);
    return context.createResult({
      generatedText: context.generatedText + JSON.stringify(chunk.output)
    });
  }

  protected async processFinish(
    chunk: Extract<LanguageModelV2StreamPart, { type: 'finish' }>,
    context: StreamHandlerContext
  ): Promise<StreamHandlerResult> {
    ensureCreateResult(context);
    // Passthrough usually doesn't update specific message status in DB
    // but we might want to track usage if needed.
    // For now, just store the chunk.
    context.generatedJSON.push(chunk);
    return context.createResult({ currentMessageId: undefined });
  }

  protected async processError(
    chunk: Extract<LanguageModelV2StreamPart, { type: 'error' }>,
    context: StreamHandlerContext
  ): Promise<StreamHandlerResult> {
    // Append to text for visibility, and store raw
    context.generatedText =
      context.generatedText +
      JSON.stringify(chunk as Record<string, unknown>);
    context.generatedJSON.push(chunk as Record<string, unknown>);
    return context.createResult({ generatedText: context.generatedText });
  }

  protected async processMetadata(
    chunk: LanguageModelV2StreamPart,
    context: StreamHandlerContext
  ): Promise<StreamHandlerResult> {
    context.generatedJSON.push(chunk as Record<string, unknown>);
    return context.createResult(true);
  }

  protected async processOther(
    chunk: LanguageModelV2StreamPart,
    context: StreamHandlerContext
  ): Promise<StreamHandlerResult> {
    // Unknown chunks appended to text
    context.generatedText =
      context.generatedText +
      JSON.stringify(chunk as Record<string, unknown>);
    return context.createResult({ generatedText: context.generatedText });
  }
}
