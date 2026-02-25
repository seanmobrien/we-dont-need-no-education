import { useState, useEffect } from 'react';

/**
 * React hook that tracks the current mouse cursor position within the browser window.
 *
 * @returns {{ x: number; y: number }} An object containing the current x and y coordinates of the mouse.
 *
 * @example
 * const { x, y } = useMousePosition();
 *
 * @remarks
 * Useful for interactive UI components that need to respond to mouse movement,
 * such as tooltips, drag-and-drop, or custom cursors.
 */
export const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };

    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  return mousePosition;
};
