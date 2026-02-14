export { cacheWithRedis } from './cacheWithRedis';
export { getRedisClient, closeRedisClient } from '@compliance-theater/redis';
export {
  getCacheConfig,
  validateCacheConfig,
  type CacheConfig,
} from './config';
export {
  metricsCollector,
  setupConsoleMetrics,
  getPrometheusMetrics,
  type CacheMetrics,
  type CacheEvent,
} from './metrics';
