/**
 * Tests for FeatureFlagFetchConfigManager
 */

import { FeatureFlagFetchConfigManager } from '../../../src/server/fetch/feature-flag-fetch-config';
import {
  getFetchConfigFactory,
  setFetchConfigFactory,
  SimpleFetchConfigManager,
} from '@compliance-theater/fetch';

describe('FeatureFlagFetchConfigManager', () => {
  // Clean up after each test
  afterEach(() => {
    setFetchConfigFactory(null);
    // Clear the internal factory stack
    while ((FeatureFlagFetchConfigManager as any).factoryStack.length > 0) {
      (FeatureFlagFetchConfigManager as any).factoryStack.pop();
    }
  });

  describe('value', () => {
    it('should return configuration object', () => {
      const manager = new FeatureFlagFetchConfigManager();
      const config = manager.value;
      expect(config).toBeDefined();
      expect(typeof config.fetch_concurrency).toBe('number');
      expect(typeof config.fetch_cache_ttl).toBe('number');
      expect(typeof config.enhanced).toBe('boolean');
    });

    it('should include timeout configuration', () => {
      const manager = new FeatureFlagFetchConfigManager();
      const config = manager.value;
      expect(config.timeout).toBeDefined();
      expect(typeof config.timeout.connect).toBe('number');
      expect(typeof config.timeout.socket).toBe('number');
    });
  });

  describe('setup() and teardown()', () => {
    it('should replace the default factory with FeatureFlagFetchConfigManager', () => {
      // Verify default factory creates SimpleFetchConfigManager
      let factory = getFetchConfigFactory();
      let manager = factory();
      expect(manager).toBeInstanceOf(SimpleFetchConfigManager);

      // Setup FeatureFlagFetchConfigManager
      const disposable = FeatureFlagFetchConfigManager.setup();

      // Verify factory now creates FeatureFlagFetchConfigManager
      factory = getFetchConfigFactory();
      manager = factory();
      expect(manager).toBeInstanceOf(FeatureFlagFetchConfigManager);

      // Dispose
      disposable[Symbol.dispose]();

      // Verify factory is restored to default
      factory = getFetchConfigFactory();
      manager = factory();
      expect(manager).toBeInstanceOf(SimpleFetchConfigManager);
    });

    it('should handle nested setup/teardown calls', () => {
      const factory1 = () => new SimpleFetchConfigManager();
      const factory2 = () => new SimpleFetchConfigManager();

      // Set a custom factory
      setFetchConfigFactory(factory1);
      expect(getFetchConfigFactory()).toBe(factory1);

      // First setup
      const disposable1 = FeatureFlagFetchConfigManager.setup();
      const currentFactory1 = getFetchConfigFactory();
      expect(currentFactory1).not.toBe(factory1);

      // Second setup (nested)
      setFetchConfigFactory(factory2);
      const disposable2 = FeatureFlagFetchConfigManager.setup();
      const currentFactory2 = getFetchConfigFactory();
      expect(currentFactory2).not.toBe(factory2);

      // Dispose inner first
      disposable2[Symbol.dispose]();
      expect(getFetchConfigFactory()).toBe(factory2);

      // Dispose outer
      disposable1[Symbol.dispose]();
      expect(getFetchConfigFactory()).toBe(factory1);
    });

    it('should handle multiple dispose calls gracefully', () => {
      const disposable = FeatureFlagFetchConfigManager.setup();

      // Verify factory is FeatureFlagFetchConfigManager
      let manager = getFetchConfigFactory()();
      expect(manager).toBeInstanceOf(FeatureFlagFetchConfigManager);

      // First dispose
      disposable[Symbol.dispose]();
      manager = getFetchConfigFactory()();
      expect(manager).toBeInstanceOf(SimpleFetchConfigManager);

      // Second dispose (should be no-op)
      disposable[Symbol.dispose]();
      manager = getFetchConfigFactory()();
      expect(manager).toBeInstanceOf(SimpleFetchConfigManager);
    });

    it('should restore to default factory when stack is empty', () => {
      // Setup without any custom factory
      const disposable = FeatureFlagFetchConfigManager.setup();

      // Verify FeatureFlagFetchConfigManager is active
      let manager = getFetchConfigFactory()();
      expect(manager).toBeInstanceOf(FeatureFlagFetchConfigManager);

      // Dispose
      disposable[Symbol.dispose]();

      // Verify default factory is restored
      manager = getFetchConfigFactory()();
      expect(manager).toBeInstanceOf(SimpleFetchConfigManager);
    });
  });

  describe('using declaration pattern', () => {
    it('should work with the using declaration pattern', () => {
      // Note: This test doesn't actually use the 'using' keyword since
      // that requires TypeScript 5.2+ with specific target settings,
      // but it demonstrates the pattern works correctly

      // Before setup
      let manager = getFetchConfigFactory()();
      expect(manager).toBeInstanceOf(SimpleFetchConfigManager);

      // Simulate using block
      {
        const disposable = FeatureFlagFetchConfigManager.setup();
        
        // Inside block - should use FeatureFlagFetchConfigManager
        manager = getFetchConfigFactory()();
        expect(manager).toBeInstanceOf(FeatureFlagFetchConfigManager);
        
        // Simulate end of block
        disposable[Symbol.dispose]();
      }

      // After block - should be restored
      manager = getFetchConfigFactory()();
      expect(manager).toBeInstanceOf(SimpleFetchConfigManager);
    });
  });

  describe('isInitialized', () => {
    it('should reflect initialization state', () => {
      const manager = new FeatureFlagFetchConfigManager();
      // Note: The actual state depends on whether flags have been loaded
      expect(typeof manager.isInitialized).toBe('boolean');
    });
  });

  describe('initialize', () => {
    it('should initialize configuration', async () => {
      const manager = new FeatureFlagFetchConfigManager();
      const config = await manager.initialize();
      expect(config).toBeDefined();
      expect(config.fetch_concurrency).toBeDefined();
    });
  });

  describe('forceRefresh', () => {
    it('should force refresh configuration', async () => {
      const manager = new FeatureFlagFetchConfigManager();
      const config = await manager.forceRefresh();
      expect(config).toBeDefined();
      expect(config.fetch_concurrency).toBeDefined();
    });
  });
});
