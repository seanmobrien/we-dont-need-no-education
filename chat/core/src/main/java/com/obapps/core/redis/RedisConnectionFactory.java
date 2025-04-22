package com.obapps.core.redis;

public class RedisConnectionFactory {

  private static IRedisConnection globalInstance;

  public static IRedisConnection getInstance() {
    return globalInstance;
  }

  public static void setGlobalInstance(IRedisConnection instance) {
    globalInstance = instance;
  }
}
