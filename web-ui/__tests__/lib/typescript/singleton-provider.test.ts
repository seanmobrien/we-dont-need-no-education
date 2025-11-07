import {
  SingletonProvider,
  globalSingleton,
  globalSingletonAsync,
  type SingletonConfig,
} from '@/lib/typescript/singleton-provider';

describe('SingletonProvider', () => {
  let provider: SingletonProvider;

  beforeEach(() => {
    // Get a fresh provider instance for each test
    provider = SingletonProvider.Instance;
    // Clear any existing singletons to ensure test isolation
    provider.clear();
  });

  afterEach(() => {
    // Clean up after each test
    provider.clear();
  });

  describe('Instance (singleton pattern)', () => {
    it('should return the same instance across multiple calls', () => {
      const instance1 = SingletonProvider.Instance;
      const instance2 = SingletonProvider.Instance;

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(SingletonProvider);
    });

    it('should be lazily initialized', () => {
      // The instance should be created only when first accessed
      expect(() => SingletonProvider.Instance).not.toThrow();
    });
  });

  describe('get()', () => {
    it('should return undefined for non-existent singleton', () => {
      const result = provider.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return existing singleton instance', () => {
      const testObject = { id: 'test' };
      provider.set('test-key', testObject);

      const result = provider.get('test-key');
      expect(result).toBe(testObject);
    });

    it('should work with symbol keys', () => {
      const symbolKey = Symbol.for('test-symbol');
      const testObject = { id: 'symbol-test' };
      provider.set(symbolKey, testObject);

      const result = provider.get(symbolKey);
      expect(result).toBe(testObject);
    });

    it('should return correct type with generic parameter', () => {
      interface TestType {
        name: string;
        value: number;
      }

      const testObject: TestType = { name: 'test', value: 42 };
      provider.set('typed-key', testObject);

      const result = provider.get<TestType>('typed-key');
      expect(result).toEqual(testObject);
      expect(result?.name).toBe('test');
      expect(result?.value).toBe(42);
    });
  });

  describe('getOrCreate()', () => {
    it('should create new singleton when it does not exist', () => {
      const factory = jest.fn(() => ({ created: true }));
      const result = provider.getOrCreate('new-key', factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ created: true });
    });

    it('should return existing singleton when it exists', () => {
      const existingObject = { existing: true };
      provider.set('existing-key', existingObject);

      const factory = jest.fn(() => ({ created: false }));
      const result = provider.getOrCreate('existing-key', factory);

      expect(factory).not.toHaveBeenCalled();
      expect(result).toBe(existingObject);
    });

    it('should create singleton with weak references when configured', () => {
      const factory = jest.fn(() => ({ weak: true }));
      const config: SingletonConfig = { weakRef: true };

      const result = provider.getOrCreate('weak-key', factory, config);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ weak: true });
      expect(provider.has('weak-key')).toBe(true);
    });

    it('should throw when weak reference factory returns non-object values', () => {
      const factory = jest.fn(() => 'primitive value');

      expect(() => {
        provider.getOrCreate('weak-invalid', factory as any, { weakRef: true });
      }).toThrow('Weak reference singletons require a non-null object value.');
    });

    it('should create singleton with strong references by default', () => {
      const factory = jest.fn(() => ({ strong: true }));

      const result = provider.getOrCreate('strong-key', factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ strong: true });
      expect(provider.has('strong-key')).toBe(true);
    });

    it('should work with symbol keys', () => {
      const symbolKey = Symbol.for('symbol-create');
      const factory = jest.fn(() => ({ symbol: true }));

      const result = provider.getOrCreate(symbolKey, factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ symbol: true });
      expect(provider.has(symbolKey)).toBe(true);
    });

    it('should throw error when factory returns null', () => {
      const factory = jest.fn(() => null);

      expect(() => {
        provider.getOrCreate('null-key', factory as any);
      }).toThrow(TypeError);
      expect(() => {
        provider.getOrCreate('null-key', factory as any);
      }).toThrow(
        'Factory for global singleton cannot return null or undefined.',
      );
    });

    it('should throw error when factory returns undefined', () => {
      const factory = jest.fn(() => undefined);

      expect(() => {
        provider.getOrCreate('undefined-key', factory as any);
      }).toThrow(TypeError);
      expect(() => {
        provider.getOrCreate('undefined-key', factory as any);
      }).toThrow(
        'Factory for global singleton cannot return null or undefined.',
      );
    });

    it('should ensure singleton behavior across multiple calls', () => {
      const factory = jest.fn(() => ({ count: 0 }));
      const result1 = provider.getOrCreate('singleton-test', factory);
      const result2 = provider.getOrCreate('singleton-test', factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
      expect(result1).toEqual({ count: 0 });
    });
  });

  describe('has()', () => {
    it('should return false for non-existent singleton', () => {
      expect(provider.has('non-existent')).toBe(false);
    });

    it('should return true for existing singleton', () => {
      provider.set('existing-key', { exists: true });
      expect(provider.has('existing-key')).toBe(true);
    });

    it('should work with symbol keys', () => {
      const symbolKey = Symbol.for('symbol-has');
      provider.set(symbolKey, { symbol: true });
      expect(provider.has(symbolKey)).toBe(true);
    });

    it('should return false after singleton is deleted', () => {
      provider.set('delete-test', { toDelete: true });
      expect(provider.has('delete-test')).toBe(true);

      provider.delete('delete-test');
      expect(provider.has('delete-test')).toBe(false);
    });
  });

  describe('set()', () => {
    it('should set singleton with strong references by default', () => {
      const testObject = { strong: true };
      provider.set('strong-set', testObject);

      expect(provider.has('strong-set')).toBe(true);
      expect(provider.get('strong-set')).toBe(testObject);
    });

    it('should set singleton with weak references when configured', () => {
      const testObject = { weak: true };
      const config: SingletonConfig = { weakRef: true };

      provider.set('weak-set', testObject, config);

      expect(provider.has('weak-set')).toBe(true);
      expect(provider.get('weak-set')).toBe(testObject);
    });

    it('should throw when setting weak reference singleton with non-object value', () => {
      expect(() => {
        provider.set('weak-set-invalid', 'primitive' as any, { weakRef: true });
      }).toThrow('Weak reference singletons require a non-null object value.');
    });

    it('should work with symbol keys', () => {
      const symbolKey = Symbol.for('symbol-set');
      const testObject = { symbol: true };

      provider.set(symbolKey, testObject);

      expect(provider.has(symbolKey)).toBe(true);
      expect(provider.get(symbolKey)).toBe(testObject);
    });

    it('should throw error when value is null', () => {
      expect(() => {
        provider.set('null-set', null as any);
      }).toThrow(TypeError);
    });

    it('should throw error when value is undefined', () => {
      expect(() => {
        provider.set('undefined-set', undefined as any);
      }).toThrow(TypeError);
    });

    it('should allow overriding existing singleton', () => {
      const original = { original: true };
      const override = { override: true };

      provider.set('override-test', original);
      expect(provider.get('override-test')).toBe(original);

      provider.set('override-test', override);
      expect(provider.get('override-test')).toBe(override);
    });
  });

  describe('clear()', () => {
    it('should remove all singletons', () => {
      provider.set('key1', { id: 1 });
      provider.set('key2', { id: 2 });
      provider.set('key3', { id: 3 });

      expect(provider.has('key1')).toBe(true);
      expect(provider.has('key2')).toBe(true);
      expect(provider.has('key3')).toBe(true);

      provider.clear();

      expect(provider.has('key1')).toBe(false);
      expect(provider.has('key2')).toBe(false);
      expect(provider.has('key3')).toBe(false);
    });

    it('should work with mixed key types', () => {
      const symbolKey = Symbol.for('symbol-clear');
      provider.set('string-key', { type: 'string' });
      provider.set(symbolKey, { type: 'symbol' });

      expect(provider.has('string-key')).toBe(true);
      expect(provider.has(symbolKey)).toBe(true);

      provider.clear();

      expect(provider.has('string-key')).toBe(false);
      expect(provider.has(symbolKey)).toBe(false);
    });

    it('should allow recreation after clear', () => {
      provider.set('recreate-test', { original: true });
      expect(provider.get('recreate-test')).toEqual({ original: true });

      provider.clear();

      provider.set('recreate-test', { recreated: true });
      expect(provider.get('recreate-test')).toEqual({ recreated: true });
    });
  });

  describe('delete()', () => {
    it('should remove specific singleton', () => {
      provider.set('keep-key', { keep: true });
      provider.set('delete-key', { delete: true });

      expect(provider.has('keep-key')).toBe(true);
      expect(provider.has('delete-key')).toBe(true);

      provider.delete('delete-key');

      expect(provider.has('keep-key')).toBe(true);
      expect(provider.has('delete-key')).toBe(false);
    });

    it('should work with symbol keys', () => {
      const symbolKey = Symbol.for('symbol-delete');
      provider.set(symbolKey, { symbol: true });

      expect(provider.has(symbolKey)).toBe(true);

      provider.delete(symbolKey);

      expect(provider.has(symbolKey)).toBe(false);
    });

    it('should not throw when deleting non-existent key', () => {
      expect(() => {
        provider.delete('non-existent');
      }).not.toThrow();
    });

    it('should allow recreation after delete', () => {
      provider.set('recreate-delete', { original: true });
      provider.delete('recreate-delete');

      provider.set('recreate-delete', { recreated: true });
      expect(provider.get('recreate-delete')).toEqual({ recreated: true });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex lifecycle with multiple operations', () => {
      // Create multiple singletons
      provider.set('service1', { name: 'service1' });
      provider.getOrCreate('service2', () => ({ name: 'service2' }));
      provider.getOrCreate('service3', () => ({ name: 'service3' }), {
        weakRef: true,
      });

      expect(provider.has('service1')).toBe(true);
      expect(provider.has('service2')).toBe(true);
      expect(provider.has('service3')).toBe(true);

      // Delete one
      provider.delete('service2');
      expect(provider.has('service1')).toBe(true);
      expect(provider.has('service2')).toBe(false);
      expect(provider.has('service3')).toBe(true);

      // Override another
      provider.set('service1', { name: 'service1-updated' });
      expect(provider.get('service1')).toEqual({ name: 'service1-updated' });

      // Clear all
      provider.clear();
      expect(provider.has('service1')).toBe(false);
      expect(provider.has('service2')).toBe(false);
      expect(provider.has('service3')).toBe(false);
    });

    it('should maintain singleton behavior across different key types', () => {
      const stringKey = 'string-key';
      const symbolKey = Symbol.for('symbol-key');

      provider.getOrCreate(stringKey, () => ({ type: 'string' }));
      provider.getOrCreate(symbolKey, () => ({ type: 'symbol' }));

      // Multiple calls should return same instances
      const stringResult1 = provider.getOrCreate(stringKey, () => ({
        type: 'new-string',
      }));
      const stringResult2 = provider.getOrCreate(stringKey, () => ({
        type: 'new-string',
      }));
      const symbolResult1 = provider.getOrCreate(symbolKey, () => ({
        type: 'new-symbol',
      }));
      const symbolResult2 = provider.getOrCreate(symbolKey, () => ({
        type: 'new-symbol',
      }));

      expect(stringResult1).toBe(stringResult2);
      expect(symbolResult1).toBe(symbolResult2);
      expect(stringResult1).toEqual({ type: 'string' });
      expect(symbolResult1).toEqual({ type: 'symbol' });
    });
  });
});

describe('globalSingleton', () => {
  let originalInstance: SingletonProvider;

  beforeEach(() => {
    // Store original instance and clear it
    originalInstance = SingletonProvider.Instance;
    originalInstance.clear();
  });

  afterEach(() => {
    // Clean up
    originalInstance.clear();
  });

  it('should create global singleton with string key', () => {
    const factory = jest.fn(() => ({ global: true }));
    const result1 = globalSingleton('global-test', factory);
    const result2 = globalSingleton('global-test', factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result1).toEqual({ global: true });
    expect(result1).toBe(result2);
  });

  it('should create global singleton with symbol key', () => {
    const symbolKey = Symbol.for('global-symbol');
    const factory = jest.fn(() => ({ symbol: true }));

    const result1 = globalSingleton(symbolKey, factory);
    const result2 = globalSingleton(symbolKey, factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result1).toEqual({ symbol: true });
    expect(result1).toBe(result2);
  });

  it('should support weak references configuration', () => {
    const factory = jest.fn(() => ({ weak: true }));
    const config: SingletonConfig = { weakRef: true };

    const result = globalSingleton('weak-global', factory, config);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ weak: true });
  });

  it('should use strong references by default', () => {
    const factory = jest.fn(() => ({ strong: true }));

    const result = globalSingleton('strong-global', factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ strong: true });
  });

  it('should throw error when factory returns null or undefined', () => {
    const nullFactory = jest.fn(() => null as any);

    const undefinedFactory = jest.fn(() => undefined as any);

    expect(() => {
      globalSingleton('null-global', nullFactory);
    }).toThrow(TypeError);

    expect(() => {
      globalSingleton('undefined-global', undefinedFactory);
    }).toThrow(TypeError);
  });

  it('should be accessible through SingletonProvider', () => {
    const factory = jest.fn(() => ({ accessible: true }));
    const globalResult = globalSingleton('cross-access', factory);
    const providerResult = SingletonProvider.Instance.get('cross-access');

    expect(globalResult).toBe(providerResult);
    expect(globalResult).toEqual({ accessible: true });
  });
});

describe('memory management', () => {
  let provider: SingletonProvider;

  beforeEach(() => {
    provider = SingletonProvider.Instance;
    provider.clear();
  });

  afterEach(() => {
    provider.clear();
  });

  it('should properly manage WeakRef storage for weak references', () => {
    const testObject = { weakManaged: true };
    const config: SingletonConfig = { weakRef: true };

    provider.set('weak-memory', testObject, config);
    expect(provider.has('weak-memory')).toBe(true);
    expect(provider.get('weak-memory')).toBe(testObject);

    // WeakRef storage should be used internally for weak references
    // This is more of an implementation detail test
  });

  it('should properly manage global storage for strong references', () => {
    const testObject = { strongManaged: true };

    provider.set('strong-memory', testObject);
    expect(provider.has('strong-memory')).toBe(true);
    expect(provider.get('strong-memory')).toBe(testObject);

    // Global storage should be used for strong references
  });

  it('should clean up both storage types on clear', () => {
    provider.set('strong-cleanup', { strong: true });
    provider.set('weak-cleanup', { weak: true }, { weakRef: true });

    expect(provider.has('strong-cleanup')).toBe(true);
    expect(provider.has('weak-cleanup')).toBe(true);

    provider.clear();

    expect(provider.has('strong-cleanup')).toBe(false);
    expect(provider.has('weak-cleanup')).toBe(false);
  });
});

describe('error handling', () => {
  let provider: SingletonProvider;

  beforeEach(() => {
    provider = SingletonProvider.Instance;
    provider.clear();
  });

  afterEach(() => {
    provider.clear();
  });

  it('should handle factory throwing errors gracefully', () => {
    const errorFactory = jest.fn(() => {
      throw new Error('Factory error');
    });

    expect(() => {
      provider.getOrCreate('error-key', errorFactory);
    }).toThrow('Factory error');

    // Should not have created the singleton
    expect(provider.has('error-key')).toBe(false);
  });

  it('should handle async factory errors', async () => {
    const asyncErrorFactory = jest.fn(async () => {
      throw new Error('Async factory error');
    });

    await expect(async () => {
      await provider.getOrCreate('async-error', asyncErrorFactory as any);
    }).rejects.toThrow('Async factory error');
  });

  it('should validate factory return values strictly', () => {
    const invalidFactories = [
      () => null,
      () => undefined,

      () => (({}) as any).nonExistent, // This would be undefined
    ];

    invalidFactories.forEach((factory, index) => {
      expect(() => {
        provider.getOrCreate(`invalid-${index}`, factory as any);
      }).toThrow(TypeError);
    });
  });
});

describe('getOrCreateAsync', () => {
  let provider: SingletonProvider;

  beforeEach(() => {
    provider = SingletonProvider.Instance;
    provider.clear();
  });

  afterEach(() => {
    provider.clear();
  });

  describe('basic functionality', () => {
    it('should create new singleton when it does not exist', async () => {
      const factory = jest.fn(async () => ({ created: true }));
      const result = await provider.getOrCreateAsync('async-new-key', factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ created: true });
    });

    it('should return existing singleton when it exists', async () => {
      const existingObject = { existing: true };
      provider.set('async-existing-key', existingObject);

      const factory = jest.fn(async () => ({ created: false }));
      const result = await provider.getOrCreateAsync(
        'async-existing-key',
        factory,
      );

      expect(factory).not.toHaveBeenCalled();
      expect(result).toBe(existingObject);
    });

    it('should work with symbol keys', async () => {
      const symbolKey = Symbol.for('async-symbol-create');
      const factory = jest.fn(async () => ({ symbol: true }));

      const result = await provider.getOrCreateAsync(symbolKey, factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ symbol: true });
      expect(provider.has(symbolKey)).toBe(true);
    });

    it('should create singleton with weak references when configured', async () => {
      const factory = jest.fn(async () => ({ weak: true }));
      const config: SingletonConfig = { weakRef: true };

      const result = await provider.getOrCreateAsync(
        'async-weak-key',
        factory,
        config,
      );

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ weak: true });
      expect(provider.has('async-weak-key')).toBe(true);
    });

    it('should create singleton with strong references by default', async () => {
      const factory = jest.fn(async () => ({ strong: true }));

      const result = await provider.getOrCreateAsync(
        'async-strong-key',
        factory,
      );

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ strong: true });
      expect(provider.has('async-strong-key')).toBe(true);
    });
  });

  describe('concurrency protection', () => {
    it('should only invoke factory once when multiple concurrent calls are made', async () => {
      let factoryCallCount = 0;
      const factory = jest.fn(async () => {
        factoryCallCount++;
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { callNumber: factoryCallCount };
      });

      // Make multiple concurrent calls
      const [result1, result2, result3] = await Promise.all([
        provider.getOrCreateAsync('concurrent-test', factory),
        provider.getOrCreateAsync('concurrent-test', factory),
        provider.getOrCreateAsync('concurrent-test', factory),
      ]);

      // Factory should only be called once
      expect(factory).toHaveBeenCalledTimes(1);

      // All results should be the same instance
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toEqual({ callNumber: 1 });
    });

    it('should handle sequential calls correctly after async creation completes', async () => {
      const factory = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { sequential: true };
      });

      // First call creates the singleton
      const result1 = await provider.getOrCreateAsync(
        'sequential-test',
        factory,
      );

      // Subsequent calls should use the cached instance
      const result2 = await provider.getOrCreateAsync(
        'sequential-test',
        factory,
      );
      const result3 = await provider.getOrCreateAsync(
        'sequential-test',
        factory,
      );

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should handle race conditions with synchronously set values', async () => {
      const asyncFactory = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { async: true };
      });

      // Start async creation
      const asyncPromise = provider.getOrCreateAsync('race-test', asyncFactory);

      // Try to get the value before async completes (should wait for async)
      const result = await asyncPromise;

      expect(asyncFactory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ async: true });
      expect(provider.get('race-test')).toBe(result);
    });

    it('should properly clean up pending factory tracking after completion', async () => {
      const factory = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { cleanup: true };
      });

      await provider.getOrCreateAsync('cleanup-test', factory);

      // Second call should use cached value, not pending factory
      const newFactory = jest.fn(async () => ({ new: true }));
      const result = await provider.getOrCreateAsync(
        'cleanup-test',
        newFactory,
      );

      expect(factory).toHaveBeenCalledTimes(1);
      expect(newFactory).not.toHaveBeenCalled();
      expect(result).toEqual({ cleanup: true });
    });

    it('should handle multiple different keys concurrently', async () => {
      const factory1 = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return { key: 'key1' };
      });

      const factory2 = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { key: 'key2' };
      });

      const factory3 = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { key: 'key3' };
      });

      const [result1, result2, result3] = await Promise.all([
        provider.getOrCreateAsync('multi-key-1', factory1),
        provider.getOrCreateAsync('multi-key-2', factory2),
        provider.getOrCreateAsync('multi-key-3', factory3),
      ]);

      expect(factory1).toHaveBeenCalledTimes(1);
      expect(factory2).toHaveBeenCalledTimes(1);
      expect(factory3).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ key: 'key1' });
      expect(result2).toEqual({ key: 'key2' });
      expect(result3).toEqual({ key: 'key3' });
    });
  });

  describe('error handling', () => {
    it('should throw error when factory returns null', async () => {
      const factory = jest.fn(async () => null);

      await expect(
        provider.getOrCreateAsync('async-null-key', factory as any),
      ).rejects.toThrow(TypeError);

      await expect(
        provider.getOrCreateAsync('async-null-key', factory as any),
      ).rejects.toThrow(
        'Factory for global singleton cannot return null or undefined.',
      );
    });

    it('should throw error when factory returns undefined', async () => {
      const factory = jest.fn(async () => undefined);

      await expect(
        provider.getOrCreateAsync('async-undefined-key', factory as any),
      ).rejects.toThrow(TypeError);

      await expect(
        provider.getOrCreateAsync('async-undefined-key', factory as any),
      ).rejects.toThrow(
        'Factory for global singleton cannot return null or undefined.',
      );
    });

    it('should propagate factory errors to all concurrent callers', async () => {
      const factory = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Factory failed');
      });

      const promises = [
        provider.getOrCreateAsync('error-concurrent', factory),
        provider.getOrCreateAsync('error-concurrent', factory),
        provider.getOrCreateAsync('error-concurrent', factory),
      ];

      await expect(Promise.all(promises)).rejects.toThrow('Factory failed');
      expect(factory).toHaveBeenCalledTimes(1);

      // Singleton should not be created after error
      expect(provider.has('error-concurrent')).toBe(false);
    });

    it('should clean up pending factory tracking on error', async () => {
      const failingFactory = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('First attempt failed');
      });

      await expect(
        provider.getOrCreateAsync('error-cleanup', failingFactory),
      ).rejects.toThrow('First attempt failed');

      // Should be able to retry with a new factory after error
      const successFactory = jest.fn(async () => ({ success: true }));
      const result = await provider.getOrCreateAsync(
        'error-cleanup',
        successFactory,
      );

      expect(successFactory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it('should throw when weak reference factory returns non-object values', async () => {
      const factory = jest.fn(async () => 'primitive value');

      await expect(
        provider.getOrCreateAsync('async-weak-invalid', factory as any, {
          weakRef: true,
        }),
      ).rejects.toThrow(
        'Weak reference singletons require a non-null object value.',
      );
    });
  });

  describe('integration with synchronous methods', () => {
    it('should return async-created singleton via synchronous get', async () => {
      const factory = jest.fn(async () => ({ asyncCreated: true }));

      const asyncResult = await provider.getOrCreateAsync(
        'sync-async-integration',
        factory,
      );
      const syncResult = provider.get('sync-async-integration');

      expect(syncResult).toBe(asyncResult);
      expect(syncResult).toEqual({ asyncCreated: true });
    });

    it('should use sync-set singleton in getOrCreateAsync', async () => {
      const syncObject = { syncSet: true };
      provider.set('async-sync-integration', syncObject);

      const factory = jest.fn(async () => ({ shouldNotCreate: true }));
      const result = await provider.getOrCreateAsync(
        'async-sync-integration',
        factory,
      );

      expect(factory).not.toHaveBeenCalled();
      expect(result).toBe(syncObject);
    });

    it('should work with getOrCreate and getOrCreateAsync for same key', async () => {
      const object = { mixed: true };

      // Create with sync method
      const syncResult = provider.getOrCreate('mixed-sync-async', () => object);

      // Retrieve with async method
      const asyncFactory = jest.fn(async () => ({ shouldNotCreate: true }));
      const asyncResult = await provider.getOrCreateAsync(
        'mixed-sync-async',
        asyncFactory,
      );

      expect(asyncFactory).not.toHaveBeenCalled();
      expect(asyncResult).toBe(syncResult);
      expect(asyncResult).toBe(object);
    });

    it('should respect delete called during async creation', async () => {
      const factory = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { willBeDeleted: true };
      });

      // Start async creation
      const promise = provider.getOrCreateAsync('delete-during-async', factory);

      // Delete while factory is running
      await new Promise((resolve) => setTimeout(resolve, 10));
      provider.delete('delete-during-async');

      // Wait for factory to complete
      const result = await promise;

      // Result should still be returned to the promise
      expect(result).toEqual({ willBeDeleted: true });

      // But it should be available in the provider since factory completed
      expect(provider.get('delete-during-async')).toBe(result);
    });
  });

  describe('type safety', () => {
    it('should maintain type safety with generic parameter', async () => {
      interface AsyncTestType {
        name: string;
        value: number;
      }

      const testObject: AsyncTestType = { name: 'async-test', value: 42 };
      const factory = jest.fn(async (): Promise<AsyncTestType> => testObject);

      const result = await provider.getOrCreateAsync<AsyncTestType>(
        'typed-async-key',
        factory,
      );

      expect(result.name).toBe('async-test');
      expect(result.value).toBe(42);
    });
  });
});

describe('globalSingletonAsync', () => {
  let originalInstance: SingletonProvider;

  beforeEach(() => {
    originalInstance = SingletonProvider.Instance;
    originalInstance.clear();
  });

  afterEach(() => {
    originalInstance.clear();
  });

  it('should create global async singleton with string key', async () => {
    const factory = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { globalAsync: true };
    });

    const result1 = await globalSingletonAsync('global-async-test', factory);
    const result2 = await globalSingletonAsync('global-async-test', factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result1).toEqual({ globalAsync: true });
    expect(result1).toBe(result2);
  });

  it('should create global async singleton with symbol key', async () => {
    const symbolKey = Symbol.for('global-async-symbol');
    const factory = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { symbol: true };
    });

    const result1 = await globalSingletonAsync(symbolKey, factory);
    const result2 = await globalSingletonAsync(symbolKey, factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result1).toEqual({ symbol: true });
    expect(result1).toBe(result2);
  });

  it('should support weak references configuration', async () => {
    const factory = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { weak: true };
    });
    const config: SingletonConfig = { weakRef: true };

    const result = await globalSingletonAsync(
      'weak-global-async',
      factory,
      config,
    );

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ weak: true });
  });

  it('should use strong references by default', async () => {
    const factory = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { strong: true };
    });

    const result = await globalSingletonAsync('strong-global-async', factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ strong: true });
  });

  it('should throw error when factory returns null or undefined', async () => {
    const nullFactory = jest.fn(async () => null as any);
    const undefinedFactory = jest.fn(async () => undefined as any);

    await expect(
      globalSingletonAsync('null-global-async', nullFactory),
    ).rejects.toThrow(TypeError);

    await expect(
      globalSingletonAsync('undefined-global-async', undefinedFactory),
    ).rejects.toThrow(TypeError);
  });

  it('should be accessible through SingletonProvider', async () => {
    const factory = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { accessible: true };
    });

    const globalResult = await globalSingletonAsync(
      'cross-access-async',
      factory,
    );
    const providerResult = SingletonProvider.Instance.get('cross-access-async');

    expect(globalResult).toBe(providerResult);
    expect(globalResult).toEqual({ accessible: true });
  });

  it('should handle concurrent calls properly', async () => {
    const factory = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { concurrent: true };
    });

    const [result1, result2, result3] = await Promise.all([
      globalSingletonAsync('concurrent-global-async', factory),
      globalSingletonAsync('concurrent-global-async', factory),
      globalSingletonAsync('concurrent-global-async', factory),
    ]);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
    expect(result1).toEqual({ concurrent: true });
  });

  it('should integrate with synchronous globalSingleton', async () => {
    const syncObject = { sync: true };

    // Create with sync function
    const syncResult = globalSingleton('mixed-global', () => syncObject);

    // Retrieve with async function
    const asyncFactory = jest.fn(async () => ({ shouldNotCreate: true }));
    const asyncResult = await globalSingletonAsync(
      'mixed-global',
      asyncFactory,
    );

    expect(asyncFactory).not.toHaveBeenCalled();
    expect(asyncResult).toBe(syncResult);
    expect(asyncResult).toBe(syncObject);
  });
});
