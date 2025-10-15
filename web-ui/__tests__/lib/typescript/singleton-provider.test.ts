import {
  SingletonProvider,
  globalSingleton,
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
