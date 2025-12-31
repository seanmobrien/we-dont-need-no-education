/**
 * @file dual-key-map.test.ts
 * @description Unit tests for DualKeyMap
 */
import { DualKeyMap } from "../../src/dual-key-map";

type TestRecord = {
  id: number;
  name: string;
  value: string;
};

describe("DualKeyMap", () => {
  let map: DualKeyMap<TestRecord, number, string>;
  const entries: [number, TestRecord][] = [
    [1, { id: 1, name: "alpha", value: "A" }],
    [2, { id: 2, name: "beta", value: "B" }],
    [3, { id: 3, name: "gamma", value: "C" }],
  ];

  beforeEach(() => {
    map = new DualKeyMap<TestRecord, number, string>(
      "id",
      "name",
      entries.values()
    );
  });

  it("should initialize with entries", () => {
    expect(map.allIds).toEqual([1, 2, 3]);
    expect(map.allNames).toEqual(["alpha", "beta", "gamma"]);
  });

  it("should get record by id", () => {
    expect(map.record(1)).toEqual({ id: 1, name: "alpha", value: "A" });
  });

  it("should get record by name", () => {
    expect(map.record("beta")).toEqual({ id: 2, name: "beta", value: "B" });
  });

  it("should get name for id", () => {
    expect(map.name(2)).toBe("beta");
  });

  it("should get id for name", () => {
    expect(map.id("gamma")).toBe(3);
  });

  it("should contain id or name", () => {
    expect(map.contains(1)).toBe(true);
    expect(map.contains("alpha")).toBe(true);
    expect(map.contains("delta")).toBe(false);
  });

  it("should add and remove records", () => {
    map.set(4, { id: 4, name: "delta", value: "D" });
    expect(map.record(4)).toEqual({ id: 4, name: "delta", value: "D" });
    expect(map.record("delta")).toEqual({ id: 4, name: "delta", value: "D" });
    map.delete(4);
    expect(map.record(4)).toBeUndefined();
    expect(map.record("delta")).toBeUndefined();
  });

  it("should clear all records", () => {
    map.clear();
    expect(map.allIds).toEqual([]);
    expect(map.allNames).toEqual([]);
  });
});
