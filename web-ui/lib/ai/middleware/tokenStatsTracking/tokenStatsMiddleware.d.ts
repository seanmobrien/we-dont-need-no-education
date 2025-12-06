/**
 * @module lib/ai/middleware/tokenStatsTracking/tokenStatsMiddleware
 * @fileoverview
 * Middleware for tracking token usage, enforcing quotas, and integrating with the state management protocol.
 * This module exports factory functions to create middleware instances that can be used with the AI SDK.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import { LanguageModelV2Middleware, LanguageModelV2CallOptions } from '@ai-sdk/provider';
import { TokenStatsMiddlewareConfig } from './types';

declare module '@/lib/ai/middleware/tokenStatsTracking/tokenStatsMiddleware' {
  /**
   * Transform parameters for token stats tracking.
   * Extends standard call options with back-office metadata for estimated tokens.
   */
  export type TokenStatsTransformParamsType = LanguageModelV2CallOptions & {
    providerOptions?: LanguageModelV2CallOptions['providerOptions'] & {
      backOffice?: {
        estTokens?: number;
      };
    };
  };

  /**
   * Transforms request parameters to estimate token usage before execution.
   * Adds estimated token count to provider options for downstream consumption.
   *
   * @param args - Arguments containing config and params.
   * @returns Transformed parameters with estimated token count.
   */
  export const transformParams: (args: {
    config: TokenStatsMiddlewareConfig;
    params: TokenStatsTransformParamsType;
  }) => Promise<TokenStatsTransformParamsType>;

  /**
   * Create token statistics tracking middleware with State Management Support
   *
   * This middleware supports the state management protocol and can participate
   * in state collection and restoration operations.
   *
   * @param config - Configuration options for the middleware.
   * @returns A configured LanguageModelV2Middleware instance.
   */
  export const tokenStatsMiddleware: (
    config?: TokenStatsMiddlewareConfig,
  ) => LanguageModelV2Middleware;

  /**
   * Create token statistics middleware with quota enforcement enabled.
   * This is a convenience wrapper around `tokenStatsMiddleware` that forces `enableQuotaEnforcement` to true.
   *
   * @param config - Configuration options (excluding `enableQuotaEnforcement`).
   * @returns A configured LanguageModelV2Middleware instance with quota enforcement.
   */
  export const tokenStatsWithQuotaMiddleware: (
    config?: Omit<TokenStatsMiddlewareConfig, 'enableQuotaEnforcement'>,
  ) => LanguageModelV2Middleware;

  /**
   * Create token statistics middleware with only logging (no quota enforcement).
   * This is a convenience wrapper around `tokenStatsMiddleware` that forces `enableQuotaEnforcement` to false
   * and `enableLogging` to true.
   *
   * @param config - Configuration options (excluding `enableQuotaEnforcement`).
   * @returns A configured LanguageModelV2Middleware instance with logging enabled.
   */
  export const tokenStatsLoggingOnlyMiddleware: (
    config?: Omit<TokenStatsMiddlewareConfig, 'enableQuotaEnforcement'>,
  ) => LanguageModelV2Middleware;
}
