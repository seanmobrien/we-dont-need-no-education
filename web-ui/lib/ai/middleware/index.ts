// Enterprise-grade AI middleware exports
export { retryRateLimitMiddleware } from './retryRateLimitMiddleware';
export { 
  createChatHistoryMiddleware, 
  initializeChatHistoryTables,
  type ChatHistoryContext 
} from './chat-history-middleware';
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
