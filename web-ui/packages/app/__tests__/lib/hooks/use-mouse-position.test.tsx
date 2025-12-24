import { renderHook, act } from '@testing-library/react';
import { useMousePosition } from '@/lib/hooks/use-mouse-position';

describe('useMousePosition', () => {
  it('initializes with default position (0, 0)', () => {
    const { result } = renderHook(() => useMousePosition());

    expect(result.current).toEqual({ x: 0, y: 0 });
  });

  it('updates position when mouse moves', () => {
    const { result } = renderHook(() => useMousePosition());

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 100, clientY: 200 }),
      );
    });

    expect(result.current).toEqual({ x: 100, y: 200 });
  });

  it('tracks multiple mouse movements', () => {
    const { result } = renderHook(() => useMousePosition());

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 50, clientY: 75 }),
      );
    });

    expect(result.current).toEqual({ x: 50, y: 75 });

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 150, clientY: 250 }),
      );
    });

    expect(result.current).toEqual({ x: 150, y: 250 });

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 0, clientY: 0 }),
      );
    });

    expect(result.current).toEqual({ x: 0, y: 0 });
  });

  it('attaches event listener on mount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    renderHook(() => useMousePosition());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
  });

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useMousePosition());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });

  it('cleans up listener properly when component unmounts', () => {
    const { result, unmount } = renderHook(() => useMousePosition());

    // Move mouse before unmount
    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 123, clientY: 456 }),
      );
    });

    expect(result.current).toEqual({ x: 123, y: 456 });

    // Unmount the hook
    unmount();

    // Remount the hook to verify it starts fresh
    const { result: newResult } = renderHook(() => useMousePosition());

    // Should be back to initial state
    expect(newResult.current).toEqual({ x: 0, y: 0 });
  });

  it('handles negative coordinates', () => {
    const { result } = renderHook(() => useMousePosition());

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: -10, clientY: -20 }),
      );
    });

    expect(result.current).toEqual({ x: -10, y: -20 });
  });

  it('handles large coordinate values', () => {
    const { result } = renderHook(() => useMousePosition());

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 9999, clientY: 8888 }),
      );
    });

    expect(result.current).toEqual({ x: 9999, y: 8888 });
  });
});
