import {
  forOneOrMany,
  serviceInstanceOverloadsFactory,
  unwrapPromise,
} from "@compliance-theater/typescript";

describe("forOneOrMany", () => {
  it("maps a scalar input through forOne", () => {
    const result = forOneOrMany((value: number) => value * 2, 4);
    expect(result).toBe(8);
  });

  it("maps an array input through forOne", () => {
    const result = forOneOrMany((value: number) => value + 1, [1, 2, 3]);
    expect(result).toEqual([2, 3, 4]);
  });
});

describe("serviceInstanceOverloadsFactory", () => {
  it("returns the service instance when called without callback", () => {
    const service = { id: "svc" };
    const serviceFactory = jest.fn(() => service);
    const overload = serviceInstanceOverloadsFactory(serviceFactory);

    const result = overload();

    expect(result).toBe(service);
    expect(serviceFactory).toHaveBeenCalledTimes(1);
  });

  it("invokes callback with service and returns callback result", () => {
    const serviceFactory = jest.fn(() => ({ count: 2 }));
    const overload = serviceInstanceOverloadsFactory(serviceFactory);

    const result = overload((service) => service.count * 10);

    expect(result).toBe(20);
    expect(serviceFactory).toHaveBeenCalledTimes(1);
  });
});

describe("unwrapPromise", () => {
  it("should return scalar value as-is", async () => {
    const result = await unwrapPromise(5);
    expect(result).toBe(5);
  });

  it("should resolve a single promise", async () => {
    const result = await unwrapPromise(Promise.resolve("hello"));
    expect(result).toBe("hello");
  });

  it("should resolve nested promises", async () => {
    const nested = Promise.resolve(Promise.resolve(Promise.resolve(true)));
    const result = await unwrapPromise(nested);
    expect(result).toBe(true);
  });

  it("should handle mixed nested promises and values", async () => {
    // Technically unwrapPromise unwraps until it hits a non-promise.
    // If we have a Promise resolving to a Promise...
    const p1 = Promise.resolve(10);
    const p2 = Promise.resolve(p1);
    const result = await unwrapPromise(p2);
    expect(result).toBe(10);
  });

  it("should reject if the promise rejects", async () => {
    const error = new Error("fail");
    await expect(unwrapPromise(Promise.reject(error))).rejects.toThrow("fail");
  });

  it("should reject if a nested promise rejects", async () => {
    const error = new Error("fail nested");
    const nested = Promise.resolve(Promise.reject(error));
    await expect(unwrapPromise(nested)).rejects.toThrow("fail nested");
  });
});
