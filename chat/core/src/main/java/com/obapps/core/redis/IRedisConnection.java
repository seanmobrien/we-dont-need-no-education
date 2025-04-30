package com.obapps.core.redis;

import org.redisson.api.RedissonClient;

/**
 * Interface representing a Redis connection.
 * Provides methods to initialize the Redis client and handle offline storage of data.
 */
public interface IRedisConnection {
  /**
   * Retrieves the Redisson client instance.
   * @return The Redisson client instance used for Redis operations.
   */
  RedissonClient getRedisClient();

  /**
   * Writes a value to offline storage. Used when critical processing would otherwise cause data to be lost.
   * @param <TValue> The type of value to be written.
   * @param value The value to persist offline.
   * @param name Optional descriptive name or tag for the value, used to help identify the value in offline storage.
   * @return The full path to the serialized file.
   */
  <TValue> String writeToOfflineStorage(TValue value, String name);

  /**
   * Writes a value to offline storage. Used when critical processing would otherwise cause data to be lost.
   * @param <TValue> The type of value to be written.
   * @param value The value to persist offline.
   * @return The full path to the serialized file.
   */
  <TValue> String writeToOfflineStorage(TValue value);

  /**
   * Starts the Redis connection.
   * @return true if the connection was successfully started, false otherwise.
   */
  Boolean start();

  /**
   * Stops the Redis connection.
   * @param force If true, forces the connection to stop immediately.
   * @return true if the connection was successfully stopped, false otherwise.
   */
  Boolean stop(Boolean force);

  /**
   * Stops the Redis connection gracefully.
   * @return true if the connection was successfully stopped, false otherwise.
   */
  Boolean stop();

  /**
   * Checks if the Redis connection is currently running.
   * @return true if the connection is running, false otherwise.
   */
  Boolean isRunning();
}
