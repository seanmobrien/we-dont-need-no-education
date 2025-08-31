import type { LanguageModelV2Content } from '@ai-sdk/provider';

/**
 * @fileoverview Type definitions for Redis cache middleware
 */

/**
 * Represents a cacheable AI response with all relevant metadata
 */
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

/**
 * Represents an entry in the cache jail system for problematic responses
 */
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
