// Enterprise-grade AI middleware exports
export { retryRateLimitMiddlewareFactory } from './key-rate-limiter/middleware';
export { rateLimitQueueManager } from './key-rate-limiter/queue-manager';
export { rateLimitMetrics } from './key-rate-limiter/metrics';
export type { 
  RateLimitedRequest, 
  ProcessedResponse, 
  RateLimitMetrics, 
  ModelClassification,
  ModelFailoverConfig 
} from './key-rate-limiter/types';
export {
  createChatHistoryMiddleware,
  type ChatHistoryContext,
} from './chat-history';
export { setNormalizedDefaultsMiddleware } from './set-normalized-defaults';
export {
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
