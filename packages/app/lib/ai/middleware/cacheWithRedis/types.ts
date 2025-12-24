import type { LanguageModelV2Content } from '@ai-sdk/provider';

export interface CacheableResponse {
  id: string;
  content: Array<LanguageModelV2Content>;
  finishReason?: string;
  usage?: Record<string, unknown>;
  warnings?: unknown[];
  rawCall?: unknown;
  rawResponse?: unknown;
  response?: unknown;
}

export interface JailEntry {
  count: number;
  firstSeen: number;
  lastSeen?: number;
  lastResponse?: {
    finishReason: string;
    hasWarnings: boolean;
    textLength: number;
  };
}
