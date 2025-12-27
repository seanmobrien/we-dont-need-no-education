import { AbortablePromise } from "@compliance-theater/typescript/abortable-promise";
import { unwrapPromise } from "@compliance-theater/typescript/_generics";

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

describe("AbortablePromise", () => {
  it("should resolve the promise", async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve("resolved"), 100);
    });

    await expect(promise.awaitable).resolves.toBe("resolved");
  });

  it("should reject the promise", async () => {
    const promise = new AbortablePromise<string>((_, reject) => {
      setTimeout(() => reject("rejected"), 100);
    });

    await expect(promise.awaitable).rejects.toBe("rejected");
  });

  it("should cancel the promise", async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve("resolved"), 100);
    });

    promise.cancel();

    await expect(promise.awaitable).rejects.toThrow("Promise was cancelled");
  });

  it("should call onrejected when cancelled", async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve("resolved"), 100);
    });

    const cancelledPromise = promise.cancelled((reason) => {
      expect(reason).toEqual(new Error("Promise was cancelled"));
      throw "cancelled";
    });

    promise.cancel();

    await expect(cancelledPromise.awaitable).rejects.toBe("cancelled");
  });

  it("should call onfulfilled when completed", async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve("resolved"), 100);
    });

    const completedPromise = promise.then((value) => {
      expect(value).toBe("resolved");
      return "completed";
    });

    await expect(completedPromise.awaitable).resolves.toBe("completed");
  });

  it("should call onfulfilled when handled in chain", async () => {
    const promise = new AbortablePromise<string>((resolve) => {
      setTimeout(() => resolve("resolved"), 100);
    });

    const completedPromise = promise
      .cancelled((e) => {
        expect(e).toEqual(new Error("Promise was cancelled"));
        return "cancelled";
      })
      .then((value) => {
        expect(value).toBe("cancelled");
        return "completed";
      });

    promise.cancel();

    await expect(completedPromise.awaitable).resolves.toBe("completed");
  });
});
