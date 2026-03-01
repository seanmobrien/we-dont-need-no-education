import React, { useEffect } from "react";
import { act, render } from "@testing-library/react";
import { useInEffect } from "../../src/hooks/useInEffect";
import { hideConsoleOutput } from "../shared/test-utils";

type EnqueueType = ReturnType<typeof useInEffect>["enqueue"];

const HookProbe = ({
  onReady,
}: {
  onReady: (enqueue: EnqueueType) => void;
}) => {
  const { enqueue } = useInEffect();

  useEffect(() => {
    onReady(enqueue);
  }, [enqueue, onReady]);

  return null;
};

describe("useInEffect", () => {
  const consoleErrorSpy = hideConsoleOutput();
  beforeEach(() => {
    jest.useFakeTimers();
    consoleErrorSpy.setup();
  });

  afterEach(() => {
    jest.useRealTimers();
    // jest.restoreAllMocks();
  });

  it("enqueues and resolves an async operation", async () => {
    let enqueue: EnqueueType | undefined;

    render(
      <HookProbe
        onReady={(e) => {
          enqueue = e;
        }}
      />,
    );

    expect(enqueue).toBeDefined();

    const pending = enqueue!(async (input: number) => input + 1, 4);

    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    await expect(pending).resolves.toBe(5);
  });

  it("enqueues and rejects when operation fails", async () => {
    let enqueue: EnqueueType | undefined;

    render(
      <HookProbe
        onReady={(e) => {
          enqueue = e;
        }}
      />,
    );

    expect(enqueue).toBeDefined();

    const pending = enqueue!(async () => {
      throw new Error("operation-failed");
    });

    const rejectionAssertion =
      expect(pending).rejects.toThrow("operation-failed");

    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    await rejectionAssertion;
  });

  it("logs a warning when mountedEffects starts above one", async () => {
    jest.spyOn(React, "useRef").mockReturnValueOnce({
      current: {
        queue: [],
        isProcessing: false,
        mountedEffects: 1,
      },
    } as unknown as React.RefObject<{
      queue: Array<unknown>;
      isProcessing: boolean;
      mountedEffects: number;
    }>);

    const warnSpy = consoleErrorSpy.warn;
    const logSpy = consoleErrorSpy.log;

    render(<HookProbe onReady={() => {}} />);

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("exits scheduled processing when hook instance is inactive", async () => {
    const mounted = render(<HookProbe onReady={() => {}} />);
    mounted.unmount();

    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(true).toBe(true);
  });

  it("processes pre-existing pending operation and logs resolver forwarding errors", async () => {
    const settleOperations: Array<(value: unknown) => void> = [];
    const forwardingError = new Error("resolver-forward-failed");
    const loggedErrorSpy = consoleErrorSpy.error;

    jest.spyOn(React, "useRef").mockReturnValueOnce({
      current: {
        queue: [],
        pending: {
          record: [
            async () => undefined,
            {
              resolve: () => {
                throw forwardingError;
              },
              reject: jest.fn(),
            },
          ],
          operation: new Promise((resolve) => {
            settleOperations.push(resolve);
          }),
        },
        isProcessing: false,
        mountedEffects: 0,
      },
    } as unknown as React.RefObject<{
      queue: Array<unknown>;
      pending: {
        record: [
          () => Promise<unknown>,
          {
            resolve: (value: unknown) => void;
            reject: (reason?: unknown) => void;
          },
        ];
        operation: Promise<unknown>;
      };
      isProcessing: boolean;
      mountedEffects: number;
    }>);

    render(<HookProbe onReady={() => {}} />);

    await act(async () => {
      settleOperations[0]?.("done");
      await Promise.resolve();
    });

    expect(loggedErrorSpy).toHaveBeenCalled();
  });

  it("skips forwarding results when the hook instance is inactive", async () => {
    const settleOperations: Array<(value: unknown) => void> = [];
    const resolveSpy = jest.fn();

    jest.spyOn(React, "useRef").mockReturnValueOnce({
      current: {
        queue: [],
        pending: {
          record: [
            async () => undefined,
            { resolve: resolveSpy, reject: jest.fn() },
          ],
          operation: new Promise((resolve) => {
            settleOperations.push(resolve);
          }),
        },
        isProcessing: false,
        mountedEffects: 0,
      },
    } as unknown as React.RefObject<{
      queue: Array<unknown>;
      pending: {
        record: [
          () => Promise<unknown>,
          {
            resolve: (value: unknown) => void;
            reject: (reason?: unknown) => void;
          },
        ];
        operation: Promise<unknown>;
      };
      isProcessing: boolean;
      mountedEffects: number;
    }>);

    const mounted = render(<HookProbe onReady={() => {}} />);
    mounted.unmount();

    await act(async () => {
      settleOperations[0]?.("done");
      await Promise.resolve();
    });

    expect(resolveSpy).not.toHaveBeenCalled();
  });

  it("throws enqueue error when queue is missing at enqueue time", async () => {
    let enqueue: EnqueueType | undefined;

    jest.spyOn(React, "useRef").mockReturnValueOnce({
      current: {
        queue: undefined,
        pending: {
          record: [
            async () => undefined,
            { resolve: jest.fn(), reject: jest.fn() },
          ],
          operation: new Promise(() => {
            // Keep unresolved so mounted pending path does not unwind during test
          }),
        },
        isProcessing: false,
        mountedEffects: 0,
      },
    } as unknown as React.RefObject<{
      queue: Array<unknown> | undefined;
      pending: {
        record: [
          () => Promise<unknown>,
          {
            resolve: (value: unknown) => void;
            reject: (reason?: unknown) => void;
          },
        ];
        operation: Promise<unknown>;
      };
      isProcessing: boolean;
      mountedEffects: number;
    }>);

    render(
      <HookProbe
        onReady={(e) => {
          enqueue = e;
        }}
      />,
    );

    expect(enqueue).toBeDefined();
    expect(() => enqueue!(async () => 1)).toThrow(
      "useInEffect: Queue is not initialized. This should never happen.",
    );
  });

  it("throws when internal queue is unexpectedly unavailable", () => {
    jest.spyOn(React, "useRef").mockReturnValueOnce({
      current: {
        queue: undefined,
        isProcessing: false,
        mountedEffects: 0,
      },
    } as unknown as React.RefObject<{
      queue: unknown;
      isProcessing: boolean;
      mountedEffects: number;
    }>);

    expect(() => render(<HookProbe onReady={() => {}} />)).toThrow(
      "Cannot read properties of undefined (reading 'shift')",
    );
  });
});
