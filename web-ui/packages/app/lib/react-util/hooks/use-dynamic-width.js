'use client';
import { useState, useEffect } from 'react';
export const useDynamicWidth = (containerRef) => {
    const [containerWidth, setContainerWidth] = useState(400);
    useEffect(() => {
        if (!containerRef.current)
            return;
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
//# sourceMappingURL=use-dynamic-width.js.map