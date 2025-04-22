package com.obapps.core.redis;

import org.redisson.api.RedissonClient;

public interface IRedisConnection {
  RedissonClient getRedisClient();
}
