/**
 * @module lib/ai/middleware/set-normalized-defaults
 * @fileoverview
 * Middleware for normalizing AI model responses and setting default configurations.
 * This middleware ensures consistent telemetry settings and attempts to parse
 * structured JSON outputs from model responses, even when not explicitly requested
 * via the provider's native structured output capabilities.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import { LanguageModelV2Middleware } from '@ai-sdk/provider';

declare module '@/lib/ai/middleware/set-normalized-defaults' {
  /**
   * Extracts JSON content from markdown code blocks (e.g., ```json ... ```).
   *
   * @param text - The input text containing a JSON code block.
   * @returns The extracted JSON string.
   * @throws {Error} If no valid JSON code block is found.
   */
  export const extractJsonFromCodeBlock: (text: string) => string;

  /**
   * Set Normalized Defaults Middleware (Original Implementation)
   *
   * This middleware:
   * 1. On request: Sets default experimental_telemetry if not present
   * 2. On response: Detects JSON code blocks and valid JSON objects, converts to structured output if structured output is empty
   */
  export const originalSetNormalizedDefaultsMiddleware: LanguageModelV2Middleware;

  /**
   * Set Normalized Defaults Middleware with State Management Support
   *
   * This middleware supports the state management protocol and can participate
   * in state collection and restoration operations. It wraps the core normalization
   * logic to ensure consistent behavior across stateful interactions.
   */
  export const setNormalizedDefaultsMiddleware: LanguageModelV2Middleware;

  export default setNormalizedDefaultsMiddleware;
}
