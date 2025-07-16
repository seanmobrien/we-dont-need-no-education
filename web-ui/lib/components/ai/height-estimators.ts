// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useDynamicWidth } from '@/lib/react-util';

// Enhanced canvas-based text measurement utilities
export const createTextMeasurer = () => {
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;

  const getContext = () => {
    if (!canvas || !context) {
      canvas = document.createElement('canvas');
      context = canvas.getContext('2d');
    }
    return context;
  };

  return {
    measureText: (
      text: string,
      fontSize: number = 14,
      fontFamily: string = 'Roboto, sans-serif',
    ) => {
      const ctx = getContext();
      if (!ctx) return { width: text.length * 8, height: fontSize * 1.4 };

      ctx.font = `${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText(text);

      return {
        width: metrics.width,
        height: fontSize * 1.4,
      };
    },

    calculateWrappedHeight: (
      text: string,
      maxWidth: number,
      fontSize: number = 14,
      fontFamily: string = 'Roboto, sans-serif',
    ) => {
      const ctx = getContext();
      if (!ctx) return Math.ceil(text.length / 50) * (fontSize * 1.4);

      ctx.font = `${fontSize}px ${fontFamily}`;

      // Handle empty text
      if (!text.trim()) return fontSize * 1.4;

      const words = text.split(/\s+/);
      let lines = 1;
      let currentLineWidth = 0;
      const spaceWidth = ctx.measureText(' ').width;

      for (const word of words) {
        const wordWidth = ctx.measureText(word).width;
        const totalWidth =
          currentLineWidth +
          (currentLineWidth > 0 ? spaceWidth : 0) +
          wordWidth;

        if (totalWidth > maxWidth && currentLineWidth > 0) {
          lines++;
          currentLineWidth = wordWidth;
        } else {
          currentLineWidth = totalWidth;
        }
      }

      return lines * (fontSize * 1.4);
    },
  };
};

// Enhanced markdown content height estimator
export const estimateMarkdownHeight = (
  text: string,
  maxWidth: number,
  textMeasurer: ReturnType<typeof createTextMeasurer>,
) => {
  // Split by lines and process each markdown element
  const lines = text.split('\n');
  let totalHeight = 0;
  let inCodeBlock = false;
  let codeBlockLines = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Handle code blocks
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        totalHeight += Math.max(codeBlockLines * 16 * 1.4, 32); // Min 32px height
        totalHeight += 16; // padding
        inCodeBlock = false;
        codeBlockLines = 0;
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockLines = 0;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines++;
      continue;
    }

    // Handle different markdown elements
    if (trimmedLine.startsWith('# ')) {
      // H1 - larger font
      totalHeight += textMeasurer.calculateWrappedHeight(
        trimmedLine.substring(2),
        maxWidth,
        24,
      );
      totalHeight += 12; // margin
    } else if (trimmedLine.startsWith('## ')) {
      // H2
      totalHeight += textMeasurer.calculateWrappedHeight(
        trimmedLine.substring(3),
        maxWidth,
        20,
      );
      totalHeight += 10;
    } else if (trimmedLine.startsWith('### ')) {
      // H3
      totalHeight += textMeasurer.calculateWrappedHeight(
        trimmedLine.substring(4),
        maxWidth,
        18,
      );
      totalHeight += 8;
    } else if (trimmedLine.startsWith('#### ')) {
      // H4
      totalHeight += textMeasurer.calculateWrappedHeight(
        trimmedLine.substring(5),
        maxWidth,
        16,
      );
      totalHeight += 6;
    } else if (
      trimmedLine.startsWith('- ') ||
      trimmedLine.startsWith('* ') ||
      trimmedLine.startsWith('+ ')
    ) {
      // List item
      totalHeight += textMeasurer.calculateWrappedHeight(
        trimmedLine.substring(2),
        maxWidth - 20,
        14,
      );
      totalHeight += 4;
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      // Numbered list item
      const match = trimmedLine.match(/^\d+\.\s(.*)$/);
      if (match) {
        totalHeight += textMeasurer.calculateWrappedHeight(
          match[1],
          maxWidth - 30,
          14,
        );
        totalHeight += 4;
      }
    } else if (trimmedLine.startsWith('> ')) {
      // Blockquote
      totalHeight += textMeasurer.calculateWrappedHeight(
        trimmedLine.substring(2),
        maxWidth - 20,
        14,
      );
      totalHeight += 8; // Extra spacing for blockquotes
    } else if (trimmedLine === '') {
      // Empty line - add paragraph spacing
      totalHeight += 8;
    } else {
      // Regular paragraph text
      totalHeight += textMeasurer.calculateWrappedHeight(
        trimmedLine,
        maxWidth,
        14,
      );
      totalHeight += 6; // paragraph spacing
    }
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockLines > 0) {
    totalHeight += codeBlockLines * 16 * 1.4;
    totalHeight += 16;
  }

  return Math.max(totalHeight, 20); // Minimum height
};

export const createElementMeasurer = () => {
  let measurementContainer: HTMLDivElement | null = null;

  const getMeasurementContainer = () => {
    if (!measurementContainer) {
      measurementContainer = document.createElement('div');
      measurementContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: 280px; /* 70% of 400px */
        visibility: hidden;
        pointer-events: none;
        font-family: Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
      `;
      document.body.appendChild(measurementContainer);
    }
    return measurementContainer;
  };

  return {
    measureMarkdown: ({ text, width }: { text: string; width: number }) => {
      const container = getMeasurementContainer();

      // Create a temporary element to measure the markdown
      const tempElement = document.createElement('div');
      tempElement.style.cssText = `
        padding: 16px;
        max-width: ${width}px; /* UI provides measurement of current width. */
        font-family: Roboto, sans-serif;
        word-wrap: break-word;
        white-space: pre-wrap;
      `;

      // Simple markdown-to-HTML conversion for measurement
      const htmlContent = text
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(
          /```[\s\S]*?```/g,
          '<pre style="padding: 8px; margin: 8px 0; background: #f5f5f5; border-radius: 4px; font-family: monospace;">Code Block</pre>',
        )
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

      tempElement.innerHTML = htmlContent;
      container.appendChild(tempElement);

      const height = tempElement.offsetHeight;
      container.removeChild(tempElement);

      return height;
    },

    cleanup: () => {
      if (measurementContainer && measurementContainer.parentNode) {
        measurementContainer.parentNode.removeChild(measurementContainer);
        measurementContainer = null;
      }
    },
  };
};

// You can also implement a learning system that improves over time:
export const createAdaptiveSizeEstimator = () => {
  const sizeCache = new Map<string, number>();
  const measurements = new Map<string, { estimated: number; actual: number }>();

  return {
    estimateSize: (
      messageId: string,
      content: string,
      estimatedHeight: number,
    ) => {
      // Check cache first
      const cached = sizeCache.get(messageId);
      if (cached) return cached;

      // Store initial estimate
      sizeCache.set(messageId, estimatedHeight);
      return estimatedHeight;
    },

    recordActualSize: (messageId: string, actualHeight: number) => {
      const estimated = sizeCache.get(messageId);
      if (estimated) {
        measurements.set(messageId, { estimated, actual: actualHeight });

        // Update cache with actual measurement
        sizeCache.set(messageId, actualHeight);

        // Learn from the difference to improve future estimates
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const ratio = actualHeight / estimated;
        // You could use this ratio to adjust future estimates
      }
    },

    getAdjustmentFactor: () => {
      if (measurements.size === 0) return 1;

      const ratios = Array.from(measurements.values()).map(
        (m) => m.actual / m.estimated,
      );
      const avgRatio =
        ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;

      return avgRatio;
    },
  };
};

// Enhanced size estimation with caching and learning
export const createSmartSizeEstimator = () => {
  const cache = new Map<string, { height: number; timestamp: number }>();
  const measurements = new Map<string, { estimated: number; actual: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const generateCacheKey = (content: string, width: number) => {
    return `${content.length}-${width}-${content.slice(0, 50)}`;
  };

  const cleanCache = () => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }
  };

  const getAdjustmentFactor = () => {
    if (measurements.size === 0) return 1;

    const recentMeasurements = Array.from(measurements.values()).slice(-20); // Last 20 measurements
    const ratios = recentMeasurements.map((m) => m.actual / m.estimated);
    const avgRatio =
      ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;

    // Clamp the adjustment factor to prevent extreme values
    return Math.max(0.5, Math.min(2.0, avgRatio));
  };

  return {
    estimateSize: (
      content: string,
      width: number,
      textMeasurer: ReturnType<typeof createTextMeasurer>,
    ) => {
      const cacheKey = generateCacheKey(content, width);

      // Check cache first
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.height;
      }

      // Calculate height
      const maxContentWidth = width * 0.7 - 32; // 70% minus padding
      const estimatedHeight = estimateMarkdownHeight(
        content,
        maxContentWidth,
        textMeasurer,
      );

      // Apply learning adjustment
      const adjustmentFactor = getAdjustmentFactor();
      const adjustedHeight = estimatedHeight * adjustmentFactor;

      // Cache the result
      cache.set(cacheKey, { height: adjustedHeight, timestamp: Date.now() });

      // Clean old cache entries periodically
      if (cache.size > 100) {
        cleanCache();
      }

      return adjustedHeight;
    },

    recordActualSize: (
      content: string,
      width: number,
      actualHeight: number,
    ) => {
      const cacheKey = generateCacheKey(content, width);
      const cached = cache.get(cacheKey);

      if (cached) {
        measurements.set(cacheKey, {
          estimated: cached.height,
          actual: actualHeight,
        });

        // Update cache with actual measurement
        cache.set(cacheKey, { height: actualHeight, timestamp: Date.now() });
      }
    },

    getAdjustmentFactor,

    clearCache: () => {
      cache.clear();
      measurements.clear();
    },
  };
};
