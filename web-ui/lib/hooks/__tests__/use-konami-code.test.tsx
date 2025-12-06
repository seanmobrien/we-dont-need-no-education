import { renderHook, act } from '@testing-library/react';
import { useKonamiCode } from '../use-konami-code';

describe('useKonamiCode', () => {
  it('calls callback when konami code is entered', () => {
    const callback = jest.fn();
    renderHook(() => useKonamiCode(callback));

    const keys = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];

    act(() => {
      keys.forEach((key) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('resets sequence on mismatch', () => {
    const callback = jest.fn();
    renderHook(() => useKonamiCode(callback));

    const keys = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'x', // Wrong key
    ];

    act(() => {
      keys.forEach((key) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('resets correctly if the wrong key is the start of the sequence', () => {
    const callback = jest.fn();
    renderHook(() => useKonamiCode(callback));

    // Up, Up, Down, Up (wrong, but starts new sequence) -> Up, Down, Down, Left, Right, Left, Right, B, A
    const keys1 = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowUp'];
    const keys2 = [
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];

    act(() => {
      [...keys1, ...keys2].forEach((key) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
