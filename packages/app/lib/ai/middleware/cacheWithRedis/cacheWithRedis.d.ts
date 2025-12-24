/**
 * @fileoverview Enterprise-grade Redis caching middleware for AI language models.
 *
 * This middleware provides:
 * - Configurable caching via environment variables.
 * - Comprehensive metrics collection.
 * - Immediate caching of successful responses.
 * - "Cache jail" mechanism for problematic responses (e.g., content filters).
 * - Promotion of jailed responses to cache after a configurable threshold.
 * - Error handling to prevent caching of failed requests.
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider';

declare module '@/lib/ai/middleware/cacheWithRedis/cacheWithRedis' {
  /**
   * Cache with Redis Middleware with State Management Support.
   *
   * This middleware wraps the AI SDK's generate and stream functions to provide caching capabilities.
   * It supports the state management protocol and can participate in state collection and restoration operations.
   */
  export const cacheWithRedis: LanguageModelV2Middleware;
}
