/**
 * Tests for SimpleFetchConfigManager
 */

import { SimpleFetchConfigManager } from '../src/fetch-config';

describe('SimpleFetchConfigManager', () => {
  let manager: SimpleFetchConfigManager;

  beforeEach(() => {
    manager = new SimpleFetchConfigManager();
  });

  describe('value', () => {
    it('should return default configuration', () => {
      const config = manager.value;
      expect(config).toBeDefined();
      expect(config.fetch_concurrency).toBe(8);
      expect(config.fetch_cache_ttl).toBe(300);
      expect(config.enhanced).toBe(false);
      expect(config.stream_enabled).toBe(true);
    });

    it('should return a new object each time', () => {
      const config1 = manager.value;
      const config2 = manager.value;
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should include all required timeout properties', () => {
      const config = manager.value;
      expect(config.timeout).toBeDefined();
      expect(config.timeout.connect).toBe(30000);
      expect(config.timeout.socket).toBe(30000);
      expect(config.timeout.request).toBe(60000);
      expect(config.timeout.response).toBe(60000);
      expect(config.timeout.send).toBe(30000);
      expect(config.timeout.lookup).toBe(5000);
    });
  });

  describe('isStale', () => {
    it('should always return false', () => {
      expect(manager.isStale).toBe(false);
    });
  });

  describe('lastError', () => {
    it('should always return null', () => {
      expect(manager.lastError).toBeNull();
    });
  });

  describe('ttlRemaining', () => {
    it('should return Infinity', () => {
      expect(manager.ttlRemaining).toBe(Infinity);
    });
  });

  describe('isInitialized', () => {
    it('should always return true', () => {
      expect(manager.isInitialized).toBe(true);
    });
  });

  describe('forceRefresh', () => {
    it('should return the default configuration', async () => {
      const config = await manager.forceRefresh();
      expect(config).toBeDefined();
      expect(config.fetch_concurrency).toBe(8);
    });
  });

  describe('initialize', () => {
    it('should return the default configuration', async () => {
      const config = await manager.initialize();
      expect(config).toBeDefined();
      expect(config.fetch_concurrency).toBe(8);
    });
  });
});
