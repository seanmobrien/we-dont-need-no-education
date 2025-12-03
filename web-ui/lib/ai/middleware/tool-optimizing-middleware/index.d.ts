/**
 * @module lib/ai/middleware/tool-optimizing-middleware
 * @fileoverview
 * Middleware for optimizing tool usage and message history in AI interactions.
 * This middleware performs two main functions:
 * 1. Tool Scanning: Dynamically discovers and registers tools used in requests.
 * 2. Message Optimization: Summarizes long chat histories to reduce token usage while preserving context.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import {
  LanguageModelV2Middleware,
  LanguageModelV2CallOptions,
  LanguageModelV2,
} from '@ai-sdk/provider';

import { ToolMap } from '../../services/model-stats/tool-map';
import { optimizeMessagesWithToolSummarization } from '../../chat/message-optimizer-tools';

declare module '@/lib/ai/middleware/tool-optimizing-middleware' {
  /**
   * Configuration options for the tool optimizing middleware
   */
  export interface ToolOptimizingMiddlewareConfig {
    /** User ID for tracking and metrics */
    userId?: string;
    /** Chat history ID for context tracking */
    chatHistoryId?: string;
    /** Enable message optimization (tool summarization) - default true */
    enableMessageOptimization?: boolean;
    /** Minimum messages required before attempting optimization - default 10 */
    optimizationThreshold?: number;
    /** Enable scanning of tool definitions to register new tools - default true */
    enableToolScanning?: boolean;
  }

  /**
   * Extended call options including legacy fields expected by existing tests/middleware chain
   */
  export interface ExtendedCallOptions extends LanguageModelV2CallOptions {
    /** Legacy alias for prompt array retained for test expectations */
    messages?: unknown[];
    /** Execution trace of prior middleware names */
    middlewareStack?: string[];
    /** Passthrough contextual fields used by other middleware integration tests */
    chatHistory?: unknown;
    rateLimitInfo?: unknown;
    telemetry?: unknown;
  }

  /**
   * Extended middleware signature permitting legacy operation identifiers
   */
  export interface ExtendedToolOptimizingMiddleware
    extends Omit<LanguageModelV2Middleware, 'transformParams'> {
    /** Accept legacy op types ('generateText' | 'streamText') in addition to canonical ones */
    transformParams?: (options: {
      type: 'generate' | 'stream' | 'generateText' | 'streamText';
      params: ExtendedCallOptions;
      model?: LanguageModelV2 | string;
    }) => Promise<ExtendedCallOptions>;
  }

  /**
   * Creates a middleware for tool optimization that handles tool scanning and message optimization.
   *
   * This middleware is responsible for:
   * - Scanning incoming tool definitions and adding new ones to the ToolMap
   * - Optimizing message history using tool summarization when configured
   * - Recording metrics for tool discovery and optimization operations
   * - Maintaining backward compatibility with existing middleware patterns
   *
   * @param config - Configuration options for the middleware
   * @returns A middleware object implementing `LanguageModelV2Middleware`
   */
  export function createToolOptimizingMiddleware(
    config?: ToolOptimizingMiddlewareConfig,
  ): ExtendedToolOptimizingMiddleware;

  /**
   * Export metrics collection for observability integration
   */
  export const getToolOptimizingMiddlewareMetrics: () => {
    counters: {
      tool_optimization_middleware_total: string;
      tool_scanning_total: string;
      message_optimization_enabled_total: string;
    };
    histograms: {
      tool_optimization_middleware_duration_ms: string;
      new_tools_found_count: string;
    };
  };

  export { ToolMap, optimizeMessagesWithToolSummarization };
}
