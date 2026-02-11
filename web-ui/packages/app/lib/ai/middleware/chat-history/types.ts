import type { DbTransactionType, ChatMessagesType } from '@compliance-theater/database';
import { LanguageModelV2StreamPart } from '@ai-sdk/provider';
import { Span } from '@opentelemetry/api';

export interface ChatHistoryContext {
  processingTimeMs?: number;
  userId: string;
  chatId?: string;
  turnId?: number;
  requestId?: string;
  messageId?: string;
  currentMessageOrder?: number;
  generatedText?: string;
  generatedJSON?: Array<Record<string, unknown>>;
  toolCalls?: StreamHandlerContext['toolCalls'];
  model?: string;
  temperature?: number;
  topP?: number;
  metadata?: Record<PropertyKey, unknown>;
  beganAt: Date;
  iteration: number;
  span: Span;
  error: unknown;
  dispose: () => Promise<void>;
}

export type ToolStatus = 'pending' | 'result' | 'error' | 'content';

export interface StreamHandlerContext {
  chatId: string;
  turnId: number;
  messageId?: number;
  currentMessageOrder: number;
  generatedText: string;
  generatedJSON: Array<Record<string, unknown>>;
  toolCalls: Map<string, ChatMessagesType>;
  createResult: (
    success?: boolean | Partial<StreamHandlerResult>,
  ) => StreamHandlerResult;
}

export interface StreamHandlerResult {
  chatId: string;
  turnId: number;
  messageId: number;
  currentMessageId: number | undefined;
  currentMessageOrder: number;
  generatedText: string;
  generatedJSON: Array<Record<string, unknown>>;
  toolCalls: Map<string, ChatMessagesType>;
  success: boolean;
}

export interface QueuedTask {
  id: number;
  chunk: LanguageModelV2StreamPart;
  context: StreamHandlerContext;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
  result?: StreamHandlerResult;
}

export interface FlushContext {
  chatId: string;
  turnId?: number;
  messageId?: number;
  generatedText: string;
  startTime: number;
}

export interface FlushResult {
  success: boolean;
  error?: Error;
  processingTimeMs: number;
  textLength: number;
  contentLength?: number;
  finalMessageId?: number;
  retryRecommended?: boolean;
  metadata?: Record<string, unknown>;
}

export interface FlushConfig {
  autoGenerateTitle: boolean;
  maxTitleLength: number;
  titleWordCount: number;
  flushIntervalMs?: number;
  timeoutMs?: number;
  enableMetrics?: boolean;
  batchSize?: number;
  retryAttempts?: number;
  compressionEnabled?: boolean;
  verboseLogging?: boolean;
}

export interface MessagePersistenceInit {
  chatId: string;
  turnId: number;
  messageId?: number;
}

export interface MessageCompletionContext {
  tx?: DbTransactionType;
  chatId: string;
  turnId?: number;
  messageId?: number;
  generatedText: string;
  startTime: number;
}
