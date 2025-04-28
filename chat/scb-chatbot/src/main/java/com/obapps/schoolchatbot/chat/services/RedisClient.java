package com.obapps.schoolchatbot.chat.services;

import com.obapps.core.redis.IRedisConnection;
import com.obapps.core.redis.RedisConnectionFactory;
import com.obapps.core.util.EnvVars;
import java.util.concurrent.TimeUnit;
import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RedisClient implements IRedisConnection, AutoCloseable {

  private static RedisClient instance;
  private RedissonClient redisClient;
  private final Logger log;

  private RedisClient() {
    Runtime.getRuntime()
      .addShutdownHook(
        new Thread(() -> {
          Boolean couldStop = false;
          try {
            couldStop = this.Stop();
          } catch (Exception e) {
            System.err.println("Failed to stop RedisClient: " + e.getMessage());
            e.printStackTrace();
            couldStop = false;
          } finally {
            if (couldStop) {
              System.out.println("RedisClient stopped successfully.");
            } else {
              System.err.println("RedisClient failed to stop properly.");
            }
          }
        })
      );
    log = LoggerFactory.getLogger(RedisClient.class.getName());
  }

  @Override
  public void close() {
    if (!Stop()) {
      log.error(
        "Failed to close RedisClient",
        new Exception("RedisClient did not stop properly")
      );
    }
  }

  public Boolean Start() {
    if (redisClient != null) {
      return false;
    }
    initializeRedisConnection();
    var ret = redisClient.isShutdown() == false;
    log.info("RedisClient Started: " + ret);
    return ret;
  }

  public Boolean Stop() {
    if (redisClient != null) {
      log.info("RedisClient: Initiating shutdown");
      redisClient.shutdown(3, 15, TimeUnit.SECONDS);
      if (redisClient.isShutdown()) {
        redisClient = null;
        log.info("RedisClient Stopped: true");
        return true;
      } else {
        redisClient.shutdown();
        log.warn("RedisClient failed to stop properly.");
      }
    } else {
      return true;
    }
    return false;
  }

  public Boolean isRunning() {
    return redisClient != null && redisClient.isShutdown() == false;
  }

  private void initializeRedisConnection() {
    Config config = new Config();
    config
      .useSingleServer()
      .setAddress(EnvVars.getInstance().getRedis().getUrl())
      .setPassword(EnvVars.getInstance().getRedis().getKey())
      .setTimeout(10000)
      .setRetryAttempts(5)
      .setConnectionPoolSize(32) // default 64
      .setConnectionMinimumIdleSize(12) //default 24
      .setSubscriptionConnectionPoolSize(25) //default 50
      .setSubscriptionConnectionMinimumIdleSize(1); //default 1
    redisClient = Redisson.create(config);
    RedisConnectionFactory.setGlobalInstance(this);
  }

  public static synchronized RedisClient getInstance() {
    if (instance == null) {
      instance = new RedisClient();
    }
    return instance;
  }

  @Override
  public RedissonClient getRedisClient() {
    return redisClient;
  }
}
