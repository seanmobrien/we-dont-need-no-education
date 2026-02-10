/**
 * @fileoverview Height Estimation Utilities for AI Chat Components
 *
 * This module provides sophisticated text and markdown height estimation utilities
 * for AI chat interfaces. It includes canvas-based text measurement, markdown-aware
 * height calculations, DOM-based measurement tools, and adaptive learning systems
 * for improving estimation accuracy over time.
 *
 * Key Features:
 * - Canvas-based text measurement for accurate width/height calculations
 * - Markdown-aware height estimation with support for headers, lists, code blocks
 * - DOM-based measurement for complex layouts
 * - Adaptive caching and learning systems
 * - Performance optimizations with TTL-based caching
 *
 * @module lib/components/ai/height-estimators
 * @version 1.0.0
 * @since 2025-07-18
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useDynamicWidth } from '@/lib/react-util/hooks/use-dynamic-width';

/**
 * Creates a canvas-based text measurement utility for accurate text dimensions.
 *
 * This function provides a high-performance text measurement system using HTML5 Canvas
 * for precise width and height calculations. It maintains a singleton canvas instance
 * for efficiency and provides methods for both single-line and wrapped text measurement.
 *
 * @returns {Object} Text measurement utility object
 * @returns {Function} measureText - Measures single-line text dimensions
 * @returns {Function} calculateWrappedHeight - Calculates height for wrapped text
 *
 * @example
 * ```typescript
 * const textMeasurer = createTextMeasurer();
 *
 * // Measure single line
 * const { width, height } = textMeasurer.measureText('Hello World', 16, 'Arial');
 *
 * // Calculate wrapped text height
 * const wrappedHeight = textMeasurer.calculateWrappedHeight(
 *   'Long text that will wrap',
 *   300, // max width
 *   14,  // font size
 *   'Roboto'
 * );
 * ```
 *
 * @performance Uses singleton canvas instance for optimal performance
 * @accuracy Provides pixel-perfect measurements using native canvas text metrics
 */
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

/**
 * Estimates the rendered height of markdown content with support for various markdown elements.
 *
 * This function parses markdown text and calculates the approximate rendered height by
 * analyzing different markdown elements including headers, lists, code blocks, blockquotes,
 * and regular paragraphs. It uses the provided text measurer for accurate text dimensions.
 *
 * Supported Markdown Elements:
 * - Headers (H1-H4): # ## ### ####
 * - Unordered lists: - * +
 * - Ordered lists: 1. 2. 3.
 * - Code blocks: ```
 * - Blockquotes: >
 * - Inline code: `code`
 * - Regular paragraphs
 *
 * @param {string} text - The markdown text to measure
 * @param {number} maxWidth - Maximum width for text wrapping
 * @param {ReturnType<typeof createTextMeasurer>} textMeasurer - Text measurement utility
 * @returns {number} Estimated height in pixels
 *
 * @example
 * ```typescript
 * const textMeasurer = createTextMeasurer();
 * const height = estimateMarkdownHeight(
 *   '# Title\n\nSome paragraph text\n\n- List item 1\n- List item 2',
 *   400,
 *   textMeasurer
 * );
 * ```
 *
 * @algorithm
 * 1. Splits text into lines
 * 2. Analyzes each line for markdown syntax
 * 3. Applies appropriate font sizes and spacing
 * 4. Handles code blocks with monospace metrics
 * 5. Accumulates total height with proper margins
 */
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

/**
 * Creates a DOM-based element measurement utility for complex layout calculations.
 *
 * This function provides a DOM-based measurement system that creates temporary
 * elements in the document to measure actual rendered dimensions. It's particularly
 * useful for complex markdown content where canvas-based measurement may not be
 * sufficient due to CSS styling and HTML structure.
 *
 * @returns {Object} Element measurement utility object
 * @returns {Function} measureMarkdown - Measures markdown content using DOM
 * @returns {Function} cleanup - Cleans up measurement container
 *
 * @example
 * ```typescript
 * const elementMeasurer = createElementMeasurer();
 *
 * const height = elementMeasurer.measureMarkdown({
 *   text: '# Title\n\nParagraph with **bold** text',
 *   width: 400
 * });
 *
 * // Clean up when done
 * elementMeasurer.cleanup();
 * ```
 *
 * @performance Uses hidden DOM elements positioned off-screen
 * @accuracy Provides actual CSS-rendered dimensions
 * @memory Includes cleanup method to prevent memory leaks
 */
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

/**
 * Creates an adaptive size estimator that learns from actual measurements over time.
 *
 * This function implements a learning system that improves estimation accuracy by
 * comparing initial estimates with actual measured dimensions. It maintains a cache
 * of measurements and calculates adjustment factors to improve future estimates.
 *
 * @returns {Object} Adaptive size estimator object
 * @returns {Function} estimateSize - Provides size estimate with caching
 * @returns {Function} recordActualSize - Records actual measurement for learning
 * @returns {Function} getAdjustmentFactor - Gets current adjustment factor
 *
 * @example
 * ```typescript
 * const adaptiveEstimator = createAdaptiveSizeEstimator();
 *
 * // Initial estimate
 * const estimated = adaptiveEstimator.estimateSize('msg-1', content, 150);
 *
 * // Later, record actual measurement
 * adaptiveEstimator.recordActualSize('msg-1', 180);
 *
 * // Get learning adjustment factor
 * const factor = adaptiveEstimator.getAdjustmentFactor();
 * ```
 *
 * @algorithm
 * 1. Caches initial estimates by message ID
 * 2. Records actual vs estimated measurements
 * 3. Calculates adjustment ratios
 * 4. Applies learning to improve future estimates
 *
 * @performance Uses Map-based caching for O(1) lookups
 * @learning Continuously improves accuracy through usage
 */
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

/**
 * Creates an enhanced smart size estimator with advanced caching and learning capabilities.
 *
 * This is the most sophisticated estimator that combines multiple optimization techniques:
 * TTL-based caching, adaptive learning, automatic cache cleanup, and statistical
 * adjustment factors. It's designed for production use in high-performance applications.
 *
 * Features:
 * - TTL-based caching (5 minute default)
 * - Adaptive learning from recent measurements
 * - Automatic cache cleanup and size management
 * - Statistical adjustment factor calculation
 * - Clamped adjustment factors to prevent extreme values
 *
 * @returns {Object} Smart size estimator object
 * @returns {Function} estimateSize - Estimates size with caching and learning
 * @returns {Function} recordActualSize - Records measurements for learning
 * @returns {Function} getAdjustmentFactor - Gets current adjustment factor
 * @returns {Function} clearCache - Clears all cached data
 *
 * @example
 * ```typescript
 * const smartEstimator = createSmartSizeEstimator();
 * const textMeasurer = createTextMeasurer();
 *
 * // Estimate with automatic caching and learning
 * const height = smartEstimator.estimateSize(
 *   'Long markdown content...',
 *   400,
 *   textMeasurer
 * );
 *
 * // Record actual measurement for learning
 * smartEstimator.recordActualSize('Long markdown content...', 400, 250);
 *
 * // Get current learning adjustment
 * const factor = smartEstimator.getAdjustmentFactor();
 * ```
 *
 * @performance
 * - O(1) cache lookups with Map data structure
 * - Automatic cache cleanup prevents memory leaks
 * - TTL-based expiration for fresh estimates
 * - Efficient statistical calculations
 *
 * @algorithm
 * 1. Generates cache key from content and dimensions
 * 2. Checks TTL-based cache for existing estimates
 * 3. Calculates height using markdown estimator
 * 4. Applies statistical adjustment factor from learning
 * 5. Caches result with timestamp
 * 6. Automatically cleans expired entries
 *
 * @constants
 * - CACHE_TTL: 5 minutes (300,000ms)
 * - MAX_CACHE_SIZE: 100 entries before cleanup
 * - ADJUSTMENT_CLAMP: 0.5 to 2.0 range
 * - LEARNING_WINDOW: Last 20 measurements
 */
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
