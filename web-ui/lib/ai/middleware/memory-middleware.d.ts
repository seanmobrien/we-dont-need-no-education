/**
 * @module lib/ai/middleware/memory-middleware
 * @fileoverview
 * Middleware for integrating memory capabilities into the AI SDK pipeline.
 * This middleware injects system prompts related to memory usage and prepares
 * the context for memory-aware responses.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import { LanguageModelV2Middleware } from '@ai-sdk/provider';

declare module '@/lib/ai/middleware/memory-middleware' {
  /**
   * Memory Middleware with State Management Support
   *
   * This middleware supports the state management protocol and can participate
   * in state collection and restoration operations. It wraps the core memory
   * middleware logic which handles stream transformation and parameter injection.
   */
  export const memoryMiddleware: LanguageModelV2Middleware;

  export default memoryMiddleware;
}
