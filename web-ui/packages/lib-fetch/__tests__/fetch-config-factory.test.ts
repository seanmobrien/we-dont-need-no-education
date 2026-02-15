/**
 * Tests for fetch config factory management
 */

import {
  getFetchConfigFactory,
  setFetchConfigFactory,
} from '../src/fetch-config-factory';
import { SimpleFetchConfigManager } from '../src/fetch-config';
import type { FetchConfigManager } from '../src/types';

describe('FetchConfigFactory', () => {
  // Clean up after each test
  afterEach(() => {
    setFetchConfigFactory(null);
  });

  describe('getFetchConfigFactory', () => {
    it('should return default factory initially', () => {
      const factory = getFetchConfigFactory();
      expect(factory).toBeDefined();
      expect(typeof factory).toBe('function');
    });

    it('should create SimpleFetchConfigManager by default', () => {
      const factory = getFetchConfigFactory();
      const manager = factory();
      expect(manager).toBeInstanceOf(SimpleFetchConfigManager);
    });
  });

  describe('setFetchConfigFactory', () => {
    it('should allow setting a custom factory', () => {
      const customManager: FetchConfigManager = {
        value: {
          fetch_concurrency: 99,
          fetch_stream_detect_buffer: 1024,
          fetch_stream_buffer_max: 2048,
          fetch_cache_ttl: 600,
          enhanced: true,
          timeout: {
            connect: 10000,
            socket: 10000,
            request: 20000,
            response: 20000,
            send: 10000,
            lookup: 1000,
          },
          trace_level: 'debug',
          stream_enabled: false,
          fetch_stream_max_chunks: 50,
          fetch_stream_max_total_bytes: 5 * 1024 * 1024,
          dedup_writerequests: false,
        },
        isStale: false,
        lastError: null,
        ttlRemaining: 1000,
        isInitialized: true,
        forceRefresh: async () => customManager.value,
        initialize: async () => customManager.value,
      };

      const customFactory = () => customManager;
      setFetchConfigFactory(customFactory);

      const factory = getFetchConfigFactory();
      const manager = factory();
      expect(manager).toBe(customManager);
      expect(manager.value.fetch_concurrency).toBe(99);
    });

    it('should revert to default factory when passed null', () => {
      // Set a custom factory
      const customFactory = () => ({
        value: {} as any,
        isStale: false,
        lastError: null,
        ttlRemaining: 0,
        isInitialized: true,
        forceRefresh: async () => ({} as any),
        initialize: async () => ({} as any),
      });
      setFetchConfigFactory(customFactory);

      // Verify custom factory is set
      let factory = getFetchConfigFactory();
      expect(factory).toBe(customFactory);

      // Reset to default
      setFetchConfigFactory(null);

      // Verify default factory is restored
      factory = getFetchConfigFactory();
      const manager = factory();
      expect(manager).toBeInstanceOf(SimpleFetchConfigManager);
    });

    it('should revert to default factory when passed undefined', () => {
      // Set a custom factory
      const customFactory = () => ({
        value: {} as any,
        isStale: false,
        lastError: null,
        ttlRemaining: 0,
        isInitialized: true,
        forceRefresh: async () => ({} as any),
        initialize: async () => ({} as any),
      });
      setFetchConfigFactory(customFactory);

      // Reset to default
      setFetchConfigFactory(undefined);

      // Verify default factory is restored
      const factory = getFetchConfigFactory();
      const manager = factory();
      expect(manager).toBeInstanceOf(SimpleFetchConfigManager);
    });

    it('should allow multiple factory swaps', () => {
      const factory1 = () => new SimpleFetchConfigManager();
      const factory2 = () => new SimpleFetchConfigManager();

      setFetchConfigFactory(factory1);
      expect(getFetchConfigFactory()).toBe(factory1);

      setFetchConfigFactory(factory2);
      expect(getFetchConfigFactory()).toBe(factory2);

      setFetchConfigFactory(null);
      expect(getFetchConfigFactory()).not.toBe(factory1);
      expect(getFetchConfigFactory()).not.toBe(factory2);
    });
  });

  describe('integration', () => {
    it('should work with custom manager implementations', () => {
      class CustomManager extends SimpleFetchConfigManager {
        get value() {
          return {
            ...super.value,
            fetch_concurrency: 16, // Override default
          };
        }
      }

      setFetchConfigFactory(() => new CustomManager());

      const factory = getFetchConfigFactory();
      const manager = factory();
      expect(manager.value.fetch_concurrency).toBe(16);
    });
  });
});
