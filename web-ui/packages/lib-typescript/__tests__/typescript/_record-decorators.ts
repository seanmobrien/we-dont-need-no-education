import {
  getDecoratorSymbols,
  isRecordWithUuid,
  setUuid,
  getUuid,
  isRecordDirty,
  setRecordDirty,
  isRecordWithDirtyState,
} from "../../src/record-decorators";

const symbols = getDecoratorSymbols();

describe("isRecordWithDirtyState", () => {
  it("should return true if the object has a RecordIsDirty property", () => {
    const record = { [symbols.dirty]: true };
    expect(isRecordWithDirtyState(record)).toBe(true);
  });

  it("should return false if the object does not have a RecordIsDirty property", () => {
    const record = {};
    expect(isRecordWithDirtyState(record)).toBe(false);
  });
});
describe("isRecordDirty", () => {
  it("should return true if the record is marked as dirty", () => {
    const record = { [symbols.dirty]: true };
    expect(isRecordDirty(record)).toBe(true);
  });

  it("should return false if the record is not marked as dirty", () => {
    const record = { [symbols.dirty]: false };
    expect(isRecordDirty(record)).toBe(false);
  });

  it("should return false if the record does not have a RecordIsDirty property", () => {
    const record = {};
    expect(isRecordDirty(record)).toBe(false);
  });
});

describe("markRecordAsDirty", () => {
  it("should mark the record as dirty", () => {
    const record = {};
    if (!setRecordDirty(record)) {
      throw new Error("Failed to mark record as dirty");
    }
    expect((record as any)[symbols.dirty]).toBe(true);
  });

  it("should mark the record as not dirty if isDirty is false", () => {
    const record = {};
    if (!setRecordDirty(record, false)) {
      throw new Error("Failed to mark record as dirty");
    }
    expect((record as any)[symbols.dirty]).toBe(false);
  });
});

describe("RecordUuid", () => {
  describe("isRecordWithUuid", () => {
    it("should return true if the object has a RecordUuid property", () => {
      const record = { [symbols.uuid]: "1234" };
      expect(isRecordWithUuid(record)).toBe(true);
    });

    it("should return false if the object does not have a RecordUuid property", () => {
      const record = {};
      expect(isRecordWithUuid(record)).toBe(false);
    });
  });

  describe("getUuid", () => {
    it("should return the uuid if the object has a RecordUuid property", () => {
      const uuid = "1234";
      const record = { [symbols.uuid]: uuid };
      expect(getUuid(record)).toBe(uuid);
    });

    it("should return undefined if the object does not have a RecordUuid property", () => {
      const record = {};
      expect(getUuid(record)).toBeUndefined();
    });
  });

  describe("setUuid", () => {
    it("should set the uuid property on the record", () => {
      const record = {};
      const uuid = "1234";
      const result: any = setUuid(record, uuid);
      expect(result[symbols.uuid]).toBe(uuid);
    });

    it("should generate a uuid if none is provided", () => {
      const record = {};
      const result: any = setUuid(record);
      expect(result[symbols.uuid]).toBeDefined();
    });
  });
});
