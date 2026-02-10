import { StrongReferenceStorage } from "../../../src/singleton-provider/storage-strong-ref";
import { type SingletonStorageKey } from "../../../src/singleton-provider/types";
import { log } from "@compliance-theater/logger";

describe("StrongReferenceStorage", () => {
  let storage: StrongReferenceStorage;
  let globalKey: SingletonStorageKey;
  let localKey: SingletonStorageKey;

  beforeEach(() => {
    storage = new StrongReferenceStorage();
    // Global symbol (registered in global symbol registry)
    globalKey = Symbol.for("test-global-key");
    // Local symbol (not registered)
    localKey = Symbol("test-local-key");
  });

  afterEach(() => {
    storage.clear();
    jest.clearAllMocks();
  });

  describe("set and get operations", () => {
    it("should store and retrieve a value with a global symbol key", () => {
      const testValue = { foo: "bar" };
      storage.set(globalKey, testValue);

      const retrieved = storage.get(globalKey);
      expect(retrieved).toBe(testValue);
    });

    it("should store and retrieve primitive values", () => {
      const stringKey = Symbol.for("string-key");
      const numberKey = Symbol.for("number-key");
      const booleanKey = Symbol.for("boolean-key");

      storage.set(stringKey, "test-string");
      storage.set(numberKey, 42);
      storage.set(booleanKey, true);

      expect(storage.get(stringKey)).toBe("test-string");
      expect(storage.get(numberKey)).toBe(42);
      expect(storage.get(booleanKey)).toBe(true);
    });

    it("should store and retrieve complex objects", () => {
      const complexObject = {
        nested: { deeply: { value: "test" } },
        array: [1, 2, 3],
        fn: () => "function",
      };

      storage.set(globalKey, complexObject);
      const retrieved = storage.get(globalKey);

      expect(retrieved).toBe(complexObject);
      expect((retrieved as any).nested.deeply.value).toBe("test");
      expect((retrieved as any).array).toEqual([1, 2, 3]);
    });

    it("should return undefined for non-existent keys", () => {
      const nonExistentKey = Symbol.for("non-existent");
      expect(storage.get(nonExistentKey)).toBeUndefined();
    });

    it("should handle null and undefined values", () => {
      const nullKey = Symbol.for("null-key");
      const undefinedKey = Symbol.for("undefined-key");

      storage.set(nullKey, null);
      storage.set(undefinedKey, undefined);

      expect(storage.get(nullKey)).toBeNull();
      expect(storage.get(undefinedKey)).toBeUndefined();
    });

    it("should warn when setting with a non-global symbol key", () => {
      storage.set(localKey, "test-value");

      expect(log).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should warn when getting with a non-global symbol key", () => {
      storage.get(localKey);

      expect(log).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should still work with non-global symbols despite warning", () => {
      const testValue = { data: "test" };
      storage.set(localKey, testValue);

      const retrieved = storage.get(localKey);
      expect(retrieved).toBe(testValue);
    });
  });

  describe("has operation", () => {
    it("should return true for existing keys", () => {
      storage.set(globalKey, "test");
      expect(storage.has(globalKey)).toBe(true);
    });

    it("should return false for non-existent keys", () => {
      const nonExistentKey = Symbol.for("non-existent");
      expect(storage.has(nonExistentKey)).toBe(false);
    });

    it("should return true even for undefined values", () => {
      storage.set(globalKey, undefined);
      expect(storage.has(globalKey)).toBe(true);
    });

    it("should return true for null values", () => {
      storage.set(globalKey, null);
      expect(storage.has(globalKey)).toBe(true);
    });
  });

  describe("delete operation", () => {
    it("should delete an existing key", () => {
      storage.set(globalKey, "test");
      expect(storage.has(globalKey)).toBe(true);

      storage.delete(globalKey);
      expect(storage.has(globalKey)).toBe(false);
      expect(storage.get(globalKey)).toBeUndefined();
    });

    it("should handle deleting non-existent keys gracefully", () => {
      const nonExistentKey = Symbol.for("non-existent");
      expect(() => storage.delete(nonExistentKey)).not.toThrow();
      expect(storage.has(nonExistentKey)).toBe(false);
    });

    it("should allow re-setting a deleted key", () => {
      storage.set(globalKey, "first-value");
      storage.delete(globalKey);
      storage.set(globalKey, "second-value");

      expect(storage.get(globalKey)).toBe("second-value");
    });
  });

  describe("clear operation", () => {
    it("should clear all stored values", () => {
      const key1 = Symbol.for("key1");
      const key2 = Symbol.for("key2");
      const key3 = Symbol.for("key3");

      storage.set(key1, "value1");
      storage.set(key2, "value2");
      storage.set(key3, "value3");

      storage.clear();

      expect(storage.has(key1)).toBe(false);
      expect(storage.has(key2)).toBe(false);
      expect(storage.has(key3)).toBe(false);
    });

    it("should handle clearing empty storage", () => {
      expect(() => storage.clear()).not.toThrow();
    });

    it("should allow setting values after clear", () => {
      storage.set(globalKey, "before-clear");
      storage.clear();
      storage.set(globalKey, "after-clear");

      expect(storage.get(globalKey)).toBe("after-clear");
    });

    it("should only clear keys managed by this instance", () => {
      const storage2 = new StrongReferenceStorage();
      const sharedKey = Symbol.for("shared-key");
      const storage1Key = Symbol.for("storage1-key");
      const storage2Key = Symbol.for("storage2-key");

      storage.set(sharedKey, "storage1-shared");
      storage.set(storage1Key, "storage1-only");
      storage2.set(sharedKey, "storage2-shared");
      storage2.set(storage2Key, "storage2-only");

      storage.clear();

      // Storage1's tracked keys should be cleared from its internal set
      expect(storage.has(sharedKey)).toBe(false);
      expect(storage.has(storage1Key)).toBe(false);

      // Storage2's keys should still be tracked in storage2
      expect(storage2.has(storage2Key)).toBe(true);

      // However, because they share global storage, clearing storage1's keys
      // also removes them from the global Map (including sharedKey)
      // Storage2.has() will return false because the value is gone from global
      expect(storage2.has(sharedKey)).toBe(false);
      expect(storage2.get(sharedKey)).toBeUndefined();
      expect(storage2.get(storage2Key)).toBe("storage2-only");
    });
  });

  describe("global storage persistence", () => {
    it("should persist values across multiple storage instances", () => {
      const storage1 = new StrongReferenceStorage();
      const storage2 = new StrongReferenceStorage();
      const persistentKey = Symbol.for("persistent-key");

      storage1.set(persistentKey, "shared-value");
      expect(storage2.get(persistentKey)).toBe("shared-value");
    });

    it("should maintain strong references preventing garbage collection", () => {
      const key = Symbol.for("strong-ref-key");
      let value: any = { large: "object" };

      storage.set(key, value);

      // Even if we remove our local reference, the storage should keep it
      value = null;

      const retrieved = storage.get(key);
      expect(retrieved).toEqual({ large: "object" });
    });

    it("should handle overwriting values in global storage", () => {
      const key = Symbol.for("overwrite-key");

      storage.set(key, "first-value");
      expect(storage.get(key)).toBe("first-value");

      storage.set(key, "second-value");
      expect(storage.get(key)).toBe("second-value");
    });
  });

  describe("multiple instances interaction", () => {
    it("should share global storage between instances", () => {
      const storage1 = new StrongReferenceStorage();
      const storage2 = new StrongReferenceStorage();
      const sharedKey = Symbol.for("shared-between-instances");

      storage1.set(sharedKey, "from-storage1");
      expect(storage2.get(sharedKey)).toBe("from-storage1");

      storage2.set(sharedKey, "from-storage2");
      expect(storage1.get(sharedKey)).toBe("from-storage2");
    });

    it("should track keys independently per instance", () => {
      const storage1 = new StrongReferenceStorage();
      const storage2 = new StrongReferenceStorage();
      const key1 = Symbol.for("instance1-key");
      const key2 = Symbol.for("instance2-key");

      storage1.set(key1, "value1");
      storage2.set(key2, "value2");

      // Both can access the global storage
      expect(storage1.get(key2)).toBe("value2");
      expect(storage2.get(key1)).toBe("value1");

      // But clearing only affects tracked keys
      storage1.clear();

      expect(storage1.has(key1)).toBe(false);
      expect(storage2.has(key2)).toBe(true);
      expect(storage2.get(key2)).toBe("value2");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle rapid set/get/delete cycles", () => {
      const key = Symbol.for("rapid-cycle-key");

      for (let i = 0; i < 100; i++) {
        storage.set(key, i);
        expect(storage.get(key)).toBe(i);
        if (i % 2 === 0) {
          storage.delete(key);
          expect(storage.has(key)).toBe(false);
        }
      }
    });

    it("should handle many keys efficiently", () => {
      const keys: SingletonStorageKey[] = [];
      const count = 1000;

      for (let i = 0; i < count; i++) {
        keys.push(Symbol.for(`key-${i}`));
        storage.set(keys[i], `value-${i}`);
      }

      // Verify all keys exist
      for (let i = 0; i < count; i++) {
        expect(storage.get(keys[i])).toBe(`value-${i}`);
      }

      storage.clear();

      // Verify all keys are cleared
      for (let i = 0; i < count; i++) {
        expect(storage.has(keys[i])).toBe(false);
      }
    });

    it("should handle Symbol.for with special characters", () => {
      const specialKey = Symbol.for("key-with-special-chars-!@#$%^&*()");
      storage.set(specialKey, "special-value");
      expect(storage.get(specialKey)).toBe("special-value");
    });

    it("should handle empty string symbol keys", () => {
      const emptyKey = Symbol.for("");
      storage.set(emptyKey, "empty-key-value");
      expect(storage.get(emptyKey)).toBe("empty-key-value");
    });
  });

  describe("type safety and interface compliance", () => {
    it("should implement SingletonStorageStrategy interface", () => {
      // Verify all required methods exist
      expect(typeof storage.get).toBe("function");
      expect(typeof storage.set).toBe("function");
      expect(typeof storage.has).toBe("function");
      expect(typeof storage.delete).toBe("function");
      expect(typeof storage.clear).toBe("function");
    });

    it("should handle unknown type returns correctly", () => {
      const key = Symbol.for("unknown-type-key");
      storage.set(key, { type: "test" });

      const value = storage.get(key);
      // Value should be unknown type, requiring type assertion or checking
      expect(value).toBeDefined();
      expect((value as any).type).toBe("test");
    });
  });
});
