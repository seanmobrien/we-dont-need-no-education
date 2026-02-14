export const createTextMeasurer = () => {
    let canvas = null;
    let context = null;
    const getContext = () => {
        if (!canvas || !context) {
            canvas = document.createElement('canvas');
            context = canvas.getContext('2d');
        }
        return context;
    };
    return {
        measureText: (text, fontSize = 14, fontFamily = 'Roboto, sans-serif') => {
            const ctx = getContext();
            if (!ctx)
                return { width: text.length * 8, height: fontSize * 1.4 };
            ctx.font = `${fontSize}px ${fontFamily}`;
            const metrics = ctx.measureText(text);
            return {
                width: metrics.width,
                height: fontSize * 1.4,
            };
        },
        calculateWrappedHeight: (text, maxWidth, fontSize = 14, fontFamily = 'Roboto, sans-serif') => {
            const ctx = getContext();
            if (!ctx)
                return Math.ceil(text.length / 50) * (fontSize * 1.4);
            ctx.font = `${fontSize}px ${fontFamily}`;
            if (!text.trim())
                return fontSize * 1.4;
            const words = text.split(/\s+/);
            let lines = 1;
            let currentLineWidth = 0;
            const spaceWidth = ctx.measureText(' ').width;
            for (const word of words) {
                const wordWidth = ctx.measureText(word).width;
                const totalWidth = currentLineWidth +
                    (currentLineWidth > 0 ? spaceWidth : 0) +
                    wordWidth;
                if (totalWidth > maxWidth && currentLineWidth > 0) {
                    lines++;
                    currentLineWidth = wordWidth;
                }
                else {
                    currentLineWidth = totalWidth;
                }
            }
            return lines * (fontSize * 1.4);
        },
    };
};
export const estimateMarkdownHeight = (text, maxWidth, textMeasurer) => {
    const lines = text.split('\n');
    let totalHeight = 0;
    let inCodeBlock = false;
    let codeBlockLines = 0;
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('```')) {
            if (inCodeBlock) {
                totalHeight += Math.max(codeBlockLines * 16 * 1.4, 32);
                totalHeight += 16;
                inCodeBlock = false;
                codeBlockLines = 0;
            }
            else {
                inCodeBlock = true;
                codeBlockLines = 0;
            }
            continue;
        }
        if (inCodeBlock) {
            codeBlockLines++;
            continue;
        }
        if (trimmedLine.startsWith('# ')) {
            totalHeight += textMeasurer.calculateWrappedHeight(trimmedLine.substring(2), maxWidth, 24);
            totalHeight += 12;
        }
        else if (trimmedLine.startsWith('## ')) {
            totalHeight += textMeasurer.calculateWrappedHeight(trimmedLine.substring(3), maxWidth, 20);
            totalHeight += 10;
        }
        else if (trimmedLine.startsWith('### ')) {
            totalHeight += textMeasurer.calculateWrappedHeight(trimmedLine.substring(4), maxWidth, 18);
            totalHeight += 8;
        }
        else if (trimmedLine.startsWith('#### ')) {
            totalHeight += textMeasurer.calculateWrappedHeight(trimmedLine.substring(5), maxWidth, 16);
            totalHeight += 6;
        }
        else if (trimmedLine.startsWith('- ') ||
            trimmedLine.startsWith('* ') ||
            trimmedLine.startsWith('+ ')) {
            totalHeight += textMeasurer.calculateWrappedHeight(trimmedLine.substring(2), maxWidth - 20, 14);
            totalHeight += 4;
        }
        else if (/^\d+\.\s/.test(trimmedLine)) {
            const match = trimmedLine.match(/^\d+\.\s(.*)$/);
            if (match) {
                totalHeight += textMeasurer.calculateWrappedHeight(match[1], maxWidth - 30, 14);
                totalHeight += 4;
            }
        }
        else if (trimmedLine.startsWith('> ')) {
            totalHeight += textMeasurer.calculateWrappedHeight(trimmedLine.substring(2), maxWidth - 20, 14);
            totalHeight += 8;
        }
        else if (trimmedLine === '') {
            totalHeight += 8;
        }
        else {
            totalHeight += textMeasurer.calculateWrappedHeight(trimmedLine, maxWidth, 14);
            totalHeight += 6;
        }
    }
    if (inCodeBlock && codeBlockLines > 0) {
        totalHeight += codeBlockLines * 16 * 1.4;
        totalHeight += 16;
    }
    return Math.max(totalHeight, 20);
};
export const createElementMeasurer = () => {
    let measurementContainer = null;
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
        measureMarkdown: ({ text, width }) => {
            const container = getMeasurementContainer();
            const tempElement = document.createElement('div');
            tempElement.style.cssText = `
        padding: 16px;
        max-width: ${width}px; /* UI provides measurement of current width. */
        font-family: Roboto, sans-serif;
        word-wrap: break-word;
        white-space: pre-wrap;
      `;
            const htmlContent = text
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/```[\s\S]*?```/g, '<pre style="padding: 8px; margin: 8px 0; background: #f5f5f5; border-radius: 4px; font-family: monospace;">Code Block</pre>')
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
export const createAdaptiveSizeEstimator = () => {
    const sizeCache = new Map();
    const measurements = new Map();
    return {
        estimateSize: (messageId, content, estimatedHeight) => {
            const cached = sizeCache.get(messageId);
            if (cached)
                return cached;
            sizeCache.set(messageId, estimatedHeight);
            return estimatedHeight;
        },
        recordActualSize: (messageId, actualHeight) => {
            const estimated = sizeCache.get(messageId);
            if (estimated) {
                measurements.set(messageId, { estimated, actual: actualHeight });
                sizeCache.set(messageId, actualHeight);
                const ratio = actualHeight / estimated;
            }
        },
        getAdjustmentFactor: () => {
            if (measurements.size === 0)
                return 1;
            const ratios = Array.from(measurements.values()).map((m) => m.actual / m.estimated);
            const avgRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
            return avgRatio;
        },
    };
};
export const createSmartSizeEstimator = () => {
    const cache = new Map();
    const measurements = new Map();
    const CACHE_TTL = 5 * 60 * 1000;
    const generateCacheKey = (content, width) => {
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
        if (measurements.size === 0)
            return 1;
        const recentMeasurements = Array.from(measurements.values()).slice(-20);
        const ratios = recentMeasurements.map((m) => m.actual / m.estimated);
        const avgRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
        return Math.max(0.5, Math.min(2.0, avgRatio));
    };
    return {
        estimateSize: (content, width, textMeasurer) => {
            const cacheKey = generateCacheKey(content, width);
            const cached = cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                return cached.height;
            }
            const maxContentWidth = width * 0.7 - 32;
            const estimatedHeight = estimateMarkdownHeight(content, maxContentWidth, textMeasurer);
            const adjustmentFactor = getAdjustmentFactor();
            const adjustedHeight = estimatedHeight * adjustmentFactor;
            cache.set(cacheKey, { height: adjustedHeight, timestamp: Date.now() });
            if (cache.size > 100) {
                cleanCache();
            }
            return adjustedHeight;
        },
        recordActualSize: (content, width, actualHeight) => {
            const cacheKey = generateCacheKey(content, width);
            const cached = cache.get(cacheKey);
            if (cached) {
                measurements.set(cacheKey, {
                    estimated: cached.height,
                    actual: actualHeight,
                });
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
//# sourceMappingURL=height-estimators.js.map