'use client';

import { useState, useEffect } from 'react';

/**
 * React hook that returns the current width of a referenced container element.
 *
 * This hook uses a `ResizeObserver` to monitor changes to the width of the element
 * referenced by `containerRef`. Whenever the width changes, the hook updates its state
 * and returns the new width. The initial width is set to 400.
 *
 * @param containerRef - A React ref object pointing to an HTMLElement (or null).
 * @returns The current width of the referenced container element.
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null);
 * const width = useDynamicWidth(containerRef);
 */
export const useDynamicWidth = (
  containerRef: React.RefObject<HTMLElement | null>,
) => {
  const [containerWidth, setContainerWidth] = useState(400);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return containerWidth;
};
