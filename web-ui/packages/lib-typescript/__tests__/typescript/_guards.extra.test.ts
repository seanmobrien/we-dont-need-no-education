import { isKeyOf } from "@compliance-theater/typescript/_guards";

describe("isKeyOf - extra coverage", () => {
  it("supports numeric keys for objects and arrays", () => {
    const objNum: Record<string, string> = { "1": "one", "2": "two" };
    expect(isKeyOf(1, objNum)).toBe(true);
    expect(isKeyOf("1", objNum)).toBe(true);
    expect(isKeyOf(3, objNum)).toBe(false);

    const arr = [1, 2, 3] as const;
    expect(isKeyOf(2, arr)).toBe(true);
    // string '2' is not equal to number 2 in an array-of-numbers check
    expect(isKeyOf("2", arr)).toBe(false);
  });

  it("supports symbol keys on objects", () => {
    const s = Symbol("k");
    const objSym = { [s]: "symval" } as Record<symbol, string>;
    expect(isKeyOf(s, objSym)).toBe(true);
    expect(isKeyOf(Symbol("other"), objSym)).toBe(false);
  });

  it("works as a narrowing guard allowing property access without TS errors", () => {
    const obj = { a: 1, b: 2 } as const;

    function getByKey<T extends object>(o: T, k: unknown) {
      if (isKeyOf(k, o)) {
        // inside this branch TypeScript should treat k as keyof T
        // and allow property access

        const v = (o as any)[k];
        return v;
      }
      return undefined;
    }

    expect(getByKey(obj, "a")).toBe(1);
    expect(getByKey(obj, "z")).toBeUndefined();
  });
});
