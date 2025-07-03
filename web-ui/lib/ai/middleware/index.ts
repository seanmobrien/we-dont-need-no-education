// Enterprise-grade AI middleware exports
export { retryRateLimitMiddleware } from './retryRateLimitMiddleware';
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
