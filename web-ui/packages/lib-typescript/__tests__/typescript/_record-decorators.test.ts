/**
 * Tests for @compliance-theater/typescript/record-decorators.ts
 *
 * This module tests record decorator utilities for:
 * - UUID management in records
 * - Dirty state tracking in records
 * - Symbol-based property access
 */

import {
  getDecoratorSymbols,
  isRecordWithDirtyState,
  isRecordDirty,
  setRecordDirty,
  isRecordWithUuid,
  getUuid,
  newUuid,
  setUuid,
} from "../../src/record-decorators";

describe("record-decorators", () => {
  describe("getDecoratorSymbols", () => {
    it("should return dirty and uuid symbols", () => {
      const symbols = getDecoratorSymbols();

      expect(symbols).toBeDefined();
      expect(symbols.dirty).toBeDefined();
      expect(symbols.uuid).toBeDefined();
      expect(typeof symbols.dirty).toBe("symbol");
      expect(typeof symbols.uuid).toBe("symbol");
    });

    it("should return the same symbols on multiple calls", () => {
      const symbols1 = getDecoratorSymbols();
      const symbols2 = getDecoratorSymbols();

      expect(symbols1.dirty).toBe(symbols2.dirty);
      expect(symbols1.uuid).toBe(symbols2.uuid);
    });
  });

  describe("Dirty State Management", () => {
    describe("isRecordWithDirtyState", () => {
      it("should return true for records with dirty state symbol", () => {
        const symbols = getDecoratorSymbols();
        const record = { [symbols.dirty]: false };

        expect(isRecordWithDirtyState(record)).toBe(true);
      });

      it("should return false when dirty is undefined (symbol not present means no dirty state)", () => {
        const symbols = getDecoratorSymbols();
        const record = { [symbols.dirty]: undefined };

        // When the symbol value is undefined, it's not considered to have dirty state
        expect(isRecordWithDirtyState(record)).toBe(false);
      });

      it("should return false for records without dirty state symbol", () => {
        const record = { name: "test" };

        expect(isRecordWithDirtyState(record)).toBe(false);
      });

      it("should throw when checking null", () => {
        // The function tries to access a symbol property on null which throws
        expect(() => isRecordWithDirtyState(null)).toThrow();
      });

      it("should throw when checking undefined", () => {
        // The function tries to access a symbol property on undefined which throws
        expect(() => isRecordWithDirtyState(undefined)).toThrow();
      });

      it("should return false for primitives", () => {
        expect(isRecordWithDirtyState(42)).toBe(false);
        expect(isRecordWithDirtyState("string")).toBe(false);
        expect(isRecordWithDirtyState(true)).toBe(false);
      });
    });

    describe("isRecordDirty", () => {
      it("should return true when record has dirty state set to true", () => {
        const symbols = getDecoratorSymbols();
        const record = { [symbols.dirty]: true };

        expect(isRecordDirty(record)).toBe(true);
      });

      it("should return false when record has dirty state set to false", () => {
        const symbols = getDecoratorSymbols();
        const record = { [symbols.dirty]: false };

        expect(isRecordDirty(record)).toBe(false);
      });

      it("should return false for records without dirty state", () => {
        const record = { name: "test" };

        expect(isRecordDirty(record)).toBe(false);
      });

      it("should return false when dirty state is undefined", () => {
        const symbols = getDecoratorSymbols();
        const record = { [symbols.dirty]: undefined };

        expect(isRecordDirty(record)).toBe(false);
      });
    });

    describe("setRecordDirty", () => {
      it("should set record as dirty by default", () => {
        const record = { name: "test" };
        const result = setRecordDirty(record);

        expect(result).toBe(true);
        expect(isRecordDirty(record)).toBe(true);
      });

      it("should set record as dirty when explicitly passed true", () => {
        const record = { name: "test" };
        setRecordDirty(record, true);

        expect(isRecordDirty(record)).toBe(true);
      });

      it("should set record as not dirty when passed false", () => {
        const record = { name: "test" };
        setRecordDirty(record, false);

        expect(isRecordDirty(record)).toBe(false);
        expect(isRecordWithDirtyState(record)).toBe(true);
      });

      it("should change dirty state from true to false", () => {
        const record = { name: "test" };
        setRecordDirty(record, true);
        expect(isRecordDirty(record)).toBe(true);

        setRecordDirty(record, false);
        expect(isRecordDirty(record)).toBe(false);
      });

      it("should change dirty state from false to true", () => {
        const record = { name: "test" };
        setRecordDirty(record, false);
        expect(isRecordDirty(record)).toBe(false);

        setRecordDirty(record, true);
        expect(isRecordDirty(record)).toBe(true);
      });

      it("should preserve other record properties", () => {
        const record = { name: "test", age: 30 };
        setRecordDirty(record);

        expect(record.name).toBe("test");
        expect(record.age).toBe(30);
      });

      it("should return true always", () => {
        const record = { name: "test" };
        expect(setRecordDirty(record, true)).toBe(true);
        expect(setRecordDirty(record, false)).toBe(true);
      });
    });
  });

  describe("UUID Management", () => {
    describe("isRecordWithUuid", () => {
      it("should return true for records with uuid symbol", () => {
        const symbols = getDecoratorSymbols();
        const record = { [symbols.uuid]: "123-456" };

        expect(isRecordWithUuid(record)).toBe(true);
      });

      it("should return true even when uuid is null", () => {
        const symbols = getDecoratorSymbols();
        const record = { [symbols.uuid]: null };

        expect(isRecordWithUuid(record)).toBe(true);
      });

      it("should return false when uuid is undefined (symbol not present)", () => {
        const symbols = getDecoratorSymbols();
        const record = { [symbols.uuid]: undefined };

        // When the symbol value is undefined, it's not considered to have uuid
        expect(isRecordWithUuid(record)).toBe(false);
      });

      it("should return false for records without uuid symbol", () => {
        const record = { name: "test" };

        expect(isRecordWithUuid(record)).toBe(false);
      });

      it("should return false for null", () => {
        expect(isRecordWithUuid(null)).toBe(false);
      });

      it("should return false for undefined", () => {
        expect(isRecordWithUuid(undefined)).toBe(false);
      });

      it("should return false for primitives", () => {
        expect(isRecordWithUuid(42)).toBe(false);
        expect(isRecordWithUuid("string")).toBe(false);
        expect(isRecordWithUuid(true)).toBe(false);
      });

      it("should return false for non-object types", () => {
        expect(isRecordWithUuid([])).toBe(false);
        expect(isRecordWithUuid(() => {})).toBe(false);
      });
    });

    describe("getUuid", () => {
      it("should return uuid from record with uuid symbol", () => {
        const symbols = getDecoratorSymbols();
        const uuid = "123e4567-e89b-12d3-a456-426614174000";
        const record = { [symbols.uuid]: uuid };

        expect(getUuid(record)).toBe(uuid);
      });

      it("should return null when uuid is null", () => {
        const symbols = getDecoratorSymbols();
        const record = { [symbols.uuid]: null };

        expect(getUuid(record)).toBe(null);
      });

      it("should return undefined when uuid is undefined", () => {
        const symbols = getDecoratorSymbols();
        const record = { [symbols.uuid]: undefined };

        expect(getUuid(record)).toBe(undefined);
      });

      it("should return undefined for records without uuid symbol", () => {
        const record = { name: "test" };

        expect(getUuid(record)).toBe(undefined);
      });

      it("should return undefined for null", () => {
        expect(getUuid(null)).toBe(undefined);
      });

      it("should return undefined for undefined", () => {
        expect(getUuid(undefined)).toBe(undefined);
      });

      it("should return undefined for primitives", () => {
        expect(getUuid(42)).toBe(undefined);
        expect(getUuid("string")).toBe(undefined);
        expect(getUuid(true)).toBe(undefined);
      });
    });

    describe("newUuid", () => {
      it("should generate a valid UUID", () => {
        const uuid = newUuid();

        expect(uuid).toBeDefined();
        expect(typeof uuid).toBe("string");
        expect(uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      });

      it("should generate unique UUIDs", () => {
        const uuid1 = newUuid();
        const uuid2 = newUuid();
        const uuid3 = newUuid();

        expect(uuid1).not.toBe(uuid2);
        expect(uuid2).not.toBe(uuid3);
        expect(uuid1).not.toBe(uuid3);
      });

      it("should generate multiple different UUIDs", () => {
        const uuids = new Set();
        for (let i = 0; i < 100; i++) {
          uuids.add(newUuid());
        }

        expect(uuids.size).toBe(100);
      });
    });

    describe("setUuid", () => {
      it("should set uuid on record when provided", () => {
        const record = { name: "test" };
        const uuid = "123e4567-e89b-12d3-a456-426614174000";

        const result = setUuid(record, uuid);

        expect(result).toBe(record);
        expect(getUuid(record)).toBe(uuid);
        expect(isRecordWithUuid(record)).toBe(true);
      });

      it("should generate new uuid when not provided", () => {
        const record = { name: "test" };

        const result = setUuid(record);

        expect(result).toBe(record);
        const uuid = getUuid(record);
        expect(uuid).toBeDefined();
        expect(typeof uuid).toBe("string");
        expect(uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      });

      it("should accept null as uuid value", () => {
        const record = { name: "test" };

        setUuid(record, null);

        expect(getUuid(record)).toBe(null);
        expect(isRecordWithUuid(record)).toBe(true);
      });

      it("should overwrite existing uuid", () => {
        const record = { name: "test" };
        const uuid1 = "123e4567-e89b-12d3-a456-426614174000";
        const uuid2 = "987e6543-e21b-98d7-a654-624146171000";

        setUuid(record, uuid1);
        expect(getUuid(record)).toBe(uuid1);

        setUuid(record, uuid2);
        expect(getUuid(record)).toBe(uuid2);
      });

      it("should preserve other record properties", () => {
        const record = { name: "test", age: 30 };
        const uuid = "123e4567-e89b-12d3-a456-426614174000";

        setUuid(record, uuid);

        expect(record.name).toBe("test");
        expect(record.age).toBe(30);
      });

      it("should return the same record instance", () => {
        const record = { name: "test" };
        const result = setUuid(record);

        expect(result).toBe(record);
      });

      it("should work with typed records", () => {
        interface User {
          name: string;
          email: string;
        }

        const user: User = {
          name: "John Doe",
          email: "john@example.com",
        };

        const result = setUuid(user);

        expect(result.name).toBe("John Doe");
        expect(result.email).toBe("john@example.com");
        expect(getUuid(result)).toBeDefined();
      });
    });
  });

  describe("Integration Tests", () => {
    it("should work with both dirty and uuid on same record", () => {
      const record = { name: "test" };

      setUuid(record);
      setRecordDirty(record);

      expect(isRecordWithUuid(record)).toBe(true);
      expect(isRecordWithDirtyState(record)).toBe(true);
      expect(isRecordDirty(record)).toBe(true);
      expect(getUuid(record)).toBeDefined();
    });

    it("should maintain both properties independently", () => {
      const record = { name: "test" };
      const uuid = "123e4567-e89b-12d3-a456-426614174000";

      setUuid(record, uuid);
      setRecordDirty(record, true);

      expect(getUuid(record)).toBe(uuid);
      expect(isRecordDirty(record)).toBe(true);

      setRecordDirty(record, false);
      expect(getUuid(record)).toBe(uuid); // UUID should remain unchanged
      expect(isRecordDirty(record)).toBe(false);

      setUuid(record, null);
      expect(getUuid(record)).toBe(null); // UUID changed
      expect(isRecordDirty(record)).toBe(false); // Dirty state should remain unchanged
    });

    it("should preserve symbols across different operations", () => {
      const record1 = { name: "record1" };
      const record2 = { name: "record2" };

      const uuid1 = "111-111";
      const uuid2 = "222-222";

      setUuid(record1, uuid1);
      setUuid(record2, uuid2);
      setRecordDirty(record1, true);
      setRecordDirty(record2, false);

      expect(getUuid(record1)).toBe(uuid1);
      expect(getUuid(record2)).toBe(uuid2);
      expect(isRecordDirty(record1)).toBe(true);
      expect(isRecordDirty(record2)).toBe(false);
    });
  });

  describe("Type Guards", () => {
    it("should narrow types correctly with isRecordWithDirtyState", () => {
      const record: unknown = { name: "test" };
      setRecordDirty(record as object);

      if (isRecordWithDirtyState(record)) {
        // TypeScript should know this is RecordWithDirtyState
        expect(isRecordDirty(record)).toBeDefined();
      }
    });

    it("should narrow types correctly with isRecordWithUuid", () => {
      const record: unknown = { name: "test" };
      setUuid(record as object);

      if (isRecordWithUuid(record)) {
        // TypeScript should know this is RecordWithUuid
        const uuid = getUuid(record);
        expect(uuid).toBeDefined();
      }
    });
  });
});
