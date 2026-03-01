import React from "react";
import { act, render, screen } from "@testing-library/react";
import { useDynamicWidth } from "../../src/hooks/use-dynamic-width";

type ResizeObserverLike = {
  observe: jest.Mock;
  disconnect: jest.Mock;
  callback: ResizeObserverCallback;
};

const createdObservers: ResizeObserverLike[] = [];

beforeAll(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = jest
    .fn()
    .mockImplementation((callback: ResizeObserverCallback) => {
      const mock: ResizeObserverLike = {
        observe: jest.fn(),
        disconnect: jest.fn(),
        callback,
      };
      createdObservers.push(mock);
      return mock;
    });
});

beforeEach(() => {
  createdObservers.length = 0;
});

const WidthProbe = ({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
}) => {
  const width = useDynamicWidth(containerRef);
  return <div data-testid="width-value">{String(width)}</div>;
};

describe("useDynamicWidth", () => {
  it("returns default width when ref is null and does not observe", () => {
    const ref = { current: null } as React.RefObject<HTMLElement | null>;
    render(<WidthProbe containerRef={ref} />);

    expect(screen.getByTestId("width-value").textContent).toBe("400");
    expect(createdObservers.length).toBe(0);
  });

  it("observes container and updates width from ResizeObserver entries", () => {
    const el = document.createElement("div");
    const ref = { current: el } as React.RefObject<HTMLElement | null>;
    render(<WidthProbe containerRef={ref} />);

    expect(createdObservers.length).toBe(1);
    expect(createdObservers[0].observe).toHaveBeenCalledWith(el);

    act(() => {
      createdObservers[0].callback(
        [{ contentRect: { width: 777 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    expect(screen.getByTestId("width-value").textContent).toBe("777");
  });

  it("disconnects observer on unmount", () => {
    const el = document.createElement("div");
    const ref = { current: el } as React.RefObject<HTMLElement | null>;
    const { unmount } = render(<WidthProbe containerRef={ref} />);

    unmount();

    expect(createdObservers[0].disconnect).toHaveBeenCalledTimes(1);
  });
});
