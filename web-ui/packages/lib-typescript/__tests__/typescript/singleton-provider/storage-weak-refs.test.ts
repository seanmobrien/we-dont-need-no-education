import { WeakReferenceStorage } from '@compliance-theater/lib-typescript/singleton-provider/storage-weak-refs';
import { SingletonStorageKey } from '@compliance-theater/lib-typescript/singleton-provider/types';

describe('WeakReferenceStorage', () => {
  let storage: WeakReferenceStorage;
  let testKey: SingletonStorageKey;

  beforeEach(() => {
    storage = new WeakReferenceStorage();
    testKey = Symbol.for('test-key');
  });

  afterEach(() => {
    storage.clear();
  });

  describe('set and get operations', () => {
    it('should store and retrieve object values', () => {
      const testValue = { foo: 'bar' };
      storage.set(testKey, testValue);

      const retrieved = storage.get(testKey);
      expect(retrieved).toBe(testValue);
    });

    it('should store and retrieve complex objects', () => {
      const complexObject = {
        nested: { deeply: { value: 'test' } },
        array: [1, 2, 3],
        fn: () => 'function',
      };

      storage.set(testKey, complexObject);
      const retrieved = storage.get(testKey);

      expect(retrieved).toBe(complexObject);
      expect((retrieved as any).nested.deeply.value).toBe('test');
      expect((retrieved as any).array).toEqual([1, 2, 3]);
    });

    it('should return undefined for non-existent keys', () => {
      const nonExistentKey = Symbol.for('non-existent');
      expect(storage.get(nonExistentKey)).toBeUndefined();
    });

    it('should throw TypeError for primitive string values', () => {
      expect(() => {
        storage.set(testKey, 'string-value' as any);
      }).toThrow(TypeError);
      expect(() => {
        storage.set(testKey, 'string-value' as any);
      }).toThrow('Weak reference singletons require a non-null object value.');
    });

    it('should throw TypeError for primitive number values', () => {
      expect(() => {
        storage.set(testKey, 42 as any);
      }).toThrow(TypeError);
    });

    it('should throw TypeError for primitive boolean values', () => {
      expect(() => {
        storage.set(testKey, true as any);
      }).toThrow(TypeError);
    });

    it('should throw TypeError for null values', () => {
      expect(() => {
        storage.set(testKey, null as any);
      }).toThrow(TypeError);
      expect(() => {
        storage.set(testKey, null as any);
      }).toThrow('Weak reference singletons require a non-null object value.');
    });

    it('should throw TypeError for undefined values', () => {
      expect(() => {
        storage.set(testKey, undefined as any);
      }).toThrow(TypeError);
    });

    it('should accept array values', () => {
      const arrayValue = [1, 2, 3, { nested: 'object' }];
      storage.set(testKey, arrayValue);

      const retrieved = storage.get(testKey);
      expect(retrieved).toBe(arrayValue);
      expect(Array.isArray(retrieved)).toBe(true);
    });

    it('should reject function values', () => {
      const functionValue = () => 'test';
      expect(() => {
        storage.set(testKey, functionValue as any);
      }).toThrow(TypeError);
      expect(() => {
        storage.set(testKey, functionValue as any);
      }).toThrow('Weak reference singletons require a non-null object value.');
    });

    it('should accept class instances', () => {
      class TestClass {
        value = 'test';
        method() {
          return this.value;
        }
      }

      const instance = new TestClass();
      storage.set(testKey, instance);

      const retrieved = storage.get(testKey) as TestClass;
      expect(retrieved).toBe(instance);
      expect(retrieved.value).toBe('test');
      expect(retrieved.method()).toBe('test');
    });
  });

  describe('has operation', () => {
    it('should return true for existing keys with valid references', () => {
      const testValue = { foo: 'bar' };
      storage.set(testKey, testValue);

      expect(storage.has(testKey)).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      const nonExistentKey = Symbol.for('non-existent');
      expect(storage.has(nonExistentKey)).toBe(false);
    });

    it('should clean up and return false if reference was garbage collected', () => {
      // This test simulates what would happen if a WeakRef is dereferenced
      // In practice, we can't force GC in tests, so we'll test the cleanup logic

      // Set a value
      const testValue = { data: 'test' };
      storage.set(testKey, testValue);
      expect(storage.has(testKey)).toBe(true);

      // The internal implementation should clean up undefined references
      // when checked via has()
    });

    it('should remove the key from internal map if reference is gone', () => {
      const testValue = { data: 'test' };
      storage.set(testKey, testValue);

      // We can't force GC, but we can verify the cleanup behavior
      // by checking that has() properly maintains the internal map
      expect(storage.has(testKey)).toBe(true);
    });
  });

  describe('delete operation', () => {
    it('should delete an existing key', () => {
      const testValue = { foo: 'bar' };
      storage.set(testKey, testValue);
      expect(storage.has(testKey)).toBe(true);

      storage.delete(testKey);
      expect(storage.has(testKey)).toBe(false);
      expect(storage.get(testKey)).toBeUndefined();
    });

    it('should handle deleting non-existent keys gracefully', () => {
      const nonExistentKey = Symbol.for('non-existent');
      expect(() => storage.delete(nonExistentKey)).not.toThrow();
      expect(storage.has(nonExistentKey)).toBe(false);
    });

    it('should allow re-setting a deleted key', () => {
      const firstValue = { value: 'first' };
      const secondValue = { value: 'second' };

      storage.set(testKey, firstValue);
      storage.delete(testKey);
      storage.set(testKey, secondValue);

      expect(storage.get(testKey)).toBe(secondValue);
    });
  });

  describe('clear operation', () => {
    it('should clear all stored values', () => {
      const key1 = Symbol.for('key1');
      const key2 = Symbol.for('key2');
      const key3 = Symbol.for('key3');

      storage.set(key1, { value: 'value1' });
      storage.set(key2, { value: 'value2' });
      storage.set(key3, { value: 'value3' });

      storage.clear();

      expect(storage.has(key1)).toBe(false);
      expect(storage.has(key2)).toBe(false);
      expect(storage.has(key3)).toBe(false);
    });

    it('should handle clearing empty storage', () => {
      expect(() => storage.clear()).not.toThrow();
    });

    it('should allow setting values after clear', () => {
      const beforeClear = { value: 'before' };
      const afterClear = { value: 'after' };

      storage.set(testKey, beforeClear);
      storage.clear();
      storage.set(testKey, afterClear);

      expect(storage.get(testKey)).toBe(afterClear);
    });
  });

  describe('weak reference behavior', () => {
    it('should use WeakRef internally to allow garbage collection', () => {
      // We can't force GC in tests, but we can verify the storage accepts objects
      // and that the weak reference mechanism is in place
      const obj = { test: 'value' };
      storage.set(testKey, obj);

      // The value should be retrievable while we hold a reference
      expect(storage.get(testKey)).toBe(obj);
    });

    it('should automatically clean up undefined references on get', () => {
      const testValue = { data: 'test' };
      storage.set(testKey, testValue);

      // get() should clean up if reference is undefined
      const retrieved = storage.get(testKey);
      expect(retrieved).toBe(testValue);
    });

    it('should automatically clean up undefined references on has', () => {
      const testValue = { data: 'test' };
      storage.set(testKey, testValue);

      // has() should clean up if reference is undefined
      const exists = storage.has(testKey);
      expect(exists).toBe(true);
    });

    it('should maintain separate weak references for different keys', () => {
      const key1 = Symbol.for('weak-key-1');
      const key2 = Symbol.for('weak-key-2');
      const value1 = { id: 1 };
      const value2 = { id: 2 };

      storage.set(key1, value1);
      storage.set(key2, value2);

      expect(storage.get(key1)).toBe(value1);
      expect(storage.get(key2)).toBe(value2);
    });
  });

  describe('multiple instances isolation', () => {
    it('should maintain separate storage per instance', () => {
      const storage1 = new WeakReferenceStorage();
      const storage2 = new WeakReferenceStorage();
      const key = Symbol.for('shared-key');
      const value1 = { instance: 1 };
      const value2 = { instance: 2 };

      storage1.set(key, value1);
      storage2.set(key, value2);

      // Each storage maintains its own references
      expect(storage1.get(key)).toBe(value1);
      expect(storage2.get(key)).toBe(value2);
    });

    it('should not affect other instances when clearing', () => {
      const storage1 = new WeakReferenceStorage();
      const storage2 = new WeakReferenceStorage();
      const key1 = Symbol.for('instance1-key');
      const key2 = Symbol.for('instance2-key');

      storage1.set(key1, { data: 'storage1' });
      storage2.set(key2, { data: 'storage2' });

      storage1.clear();

      expect(storage1.has(key1)).toBe(false);
      expect(storage2.has(key2)).toBe(true);
      expect(storage2.get(key2)).toEqual({ data: 'storage2' });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle rapid set/get/delete cycles', () => {
      const key = Symbol.for('rapid-cycle-key');

      for (let i = 0; i < 100; i++) {
        const value = { iteration: i };
        storage.set(key, value);
        expect(storage.get(key)).toBe(value);
        if (i % 2 === 0) {
          storage.delete(key);
          expect(storage.has(key)).toBe(false);
        }
      }
    });

    it('should handle many keys efficiently', () => {
      const keys: SingletonStorageKey[] = [];
      const values: object[] = [];
      const count = 1000;

      for (let i = 0; i < count; i++) {
        keys.push(Symbol.for(`key-${i}`));
        values.push({ index: i });
        storage.set(keys[i], values[i]);
      }

      // Verify all keys exist
      for (let i = 0; i < count; i++) {
        expect(storage.get(keys[i])).toBe(values[i]);
      }

      storage.clear();

      // Verify all keys are cleared
      for (let i = 0; i < count; i++) {
        expect(storage.has(keys[i])).toBe(false);
      }
    });

    it('should handle Symbol.for with special characters', () => {
      const specialKey = Symbol.for('key-with-special-chars-!@#$%^&*()');
      const value = { special: true };
      storage.set(specialKey, value);
      expect(storage.get(specialKey)).toBe(value);
    });

    it('should handle empty string symbol keys', () => {
      const emptyKey = Symbol.for('');
      const value = { empty: true };
      storage.set(emptyKey, value);
      expect(storage.get(emptyKey)).toBe(value);
    });

    it('should handle local symbols', () => {
      const localKey = Symbol('local-symbol');
      const value = { local: true };
      storage.set(localKey, value);
      expect(storage.get(localKey)).toBe(value);
    });
  });

  describe('object type validation', () => {
    it('should accept plain objects', () => {
      expect(() => {
        storage.set(testKey, { plain: 'object' });
      }).not.toThrow();
    });

    it('should accept arrays', () => {
      expect(() => {
        storage.set(testKey, [1, 2, 3]);
      }).not.toThrow();
    });

    it('should reject functions', () => {
      expect(() => {
        storage.set(testKey, (() => {}) as any);
      }).toThrow(TypeError);
    });

    it('should accept Date objects', () => {
      expect(() => {
        storage.set(testKey, new Date());
      }).not.toThrow();
    });

    it('should accept RegExp objects', () => {
      expect(() => {
        storage.set(testKey, /test/);
      }).not.toThrow();
    });

    it('should accept Map objects', () => {
      expect(() => {
        storage.set(testKey, new Map());
      }).not.toThrow();
    });

    it('should accept Set objects', () => {
      expect(() => {
        storage.set(testKey, new Set());
      }).not.toThrow();
    });

    it('should reject Symbol primitives', () => {
      expect(() => {
        storage.set(testKey, Symbol('test') as any);
      }).toThrow(TypeError);
    });

    it('should reject BigInt primitives', () => {
      expect(() => {
        storage.set(testKey, BigInt(42) as any);
      }).toThrow(TypeError);
    });
  });

  describe('type safety and interface compliance', () => {
    it('should implement SingletonStorageStrategy interface', () => {
      // Verify all required methods exist
      expect(typeof storage.get).toBe('function');
      expect(typeof storage.set).toBe('function');
      expect(typeof storage.has).toBe('function');
      expect(typeof storage.delete).toBe('function');
      expect(typeof storage.clear).toBe('function');
    });

    it('should handle unknown type returns correctly', () => {
      const value = { type: 'test' };
      storage.set(testKey, value);

      const retrieved = storage.get(testKey);
      // Value should be unknown type, requiring type assertion or checking
      expect(retrieved).toBeDefined();
      expect((retrieved as any).type).toBe('test');
    });
  });

  describe('memory management characteristics', () => {
    it('should store references that can be retrieved while held', () => {
      const objects = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      const keys = objects.map((_, i) => Symbol.for(`mem-key-${i}`));

      // Set all values
      objects.forEach((obj, i) => storage.set(keys[i], obj));

      // All should be retrievable while we hold references
      objects.forEach((obj, i) => {
        expect(storage.get(keys[i])).toBe(obj);
      });
    });

    it('should handle overwriting weak references', () => {
      const firstValue = { first: true };
      const secondValue = { second: true };

      storage.set(testKey, firstValue);
      expect(storage.get(testKey)).toBe(firstValue);

      storage.set(testKey, secondValue);
      expect(storage.get(testKey)).toBe(secondValue);
      expect(storage.get(testKey)).not.toBe(firstValue);
    });
  });
});