import { retryRateLimitMiddlewareFactory } from './key-rate-limiter/middleware';
import { rateLimitQueueManager } from './key-rate-limiter/queue-manager';
import { rateLimitMetrics } from './key-rate-limiter/metrics';
import type {
  RateLimitedRequest,
  ProcessedResponse,
  RateLimitMetrics,
  ModelClassification,
  ModelFailoverConfig,
} from './key-rate-limiter/types';
import {
  createChatHistoryMiddlewareEx,
  wrapChatHistoryMiddleware,
  type ChatHistoryContext,
} from './chat-history';
import { setNormalizedDefaultsMiddleware } from './set-normalized-defaults';
import {
  cacheWithRedis,
  getRedisClient,
  closeRedisClient,
  getCacheConfig,
  validateCacheConfig,
  type CacheConfig,
  metricsCollector,
  setupConsoleMetrics,
  getPrometheusMetrics,
  type CacheMetrics,
  type CacheEvent,
} from './cacheWithRedis';
import {
  type TokenStatsServiceType,
  tokenStatsMiddleware,
  tokenStatsWithQuotaMiddleware,
  tokenStatsLoggingOnlyMiddleware,
  type TokenUsageData,
  type ModelQuota,
  type TokenStats,
  type QuotaCheckResult,
  type TokenStatsMiddlewareConfig,
} from './tokenStatsTracking';
import {
  MiddlewareStateManager,
  type SerializableLanguageModelMiddleware,
  type SerializableMiddleware,
  type StatefulMiddlewareConfig,
  type StateManagementParams,
  type MiddlewareMetadata,
} from './state-management';
import {
  createToolOptimizingMiddleware,
  type ToolOptimizingMiddlewareConfig,
  getToolOptimizingMiddlewareMetrics,
} from './tool-optimizing-middleware';

/**
 * @module lib/ai/middleware
 * @fileoverview
 * Root entry point for the AI Middleware library.
 * This module exports all available middleware components, factories, and types.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-01-01
 */

declare module '@/lib/ai/middleware' {
  export type {
    RateLimitedRequest,
    ProcessedResponse,
    RateLimitMetrics,
    ModelClassification,
    ModelFailoverConfig,
    ChatHistoryContext,
    CacheConfig,
    CacheMetrics,
    CacheEvent,
    TokenStatsServiceType,
    TokenUsageData,
    ModelQuota,
    TokenStats,
    QuotaCheckResult,
    TokenStatsMiddlewareConfig,
    SerializableLanguageModelMiddleware,
    SerializableMiddleware,
    StatefulMiddlewareConfig,
    StateManagementParams,
    MiddlewareMetadata,
    ToolOptimizingMiddlewareConfig,
  };

  export {
    retryRateLimitMiddlewareFactory,
    rateLimitQueueManager,
    rateLimitMetrics,
    createChatHistoryMiddlewareEx,
    wrapChatHistoryMiddleware,
    setNormalizedDefaultsMiddleware,
    cacheWithRedis,
    getRedisClient,
    closeRedisClient,
    getCacheConfig,
    validateCacheConfig,
    metricsCollector,
    setupConsoleMetrics,
    getPrometheusMetrics,

    tokenStatsMiddleware,
    tokenStatsWithQuotaMiddleware,
    tokenStatsLoggingOnlyMiddleware,
    MiddlewareStateManager,
    createToolOptimizingMiddleware,
    getToolOptimizingMiddlewareMetrics,
  };
}
