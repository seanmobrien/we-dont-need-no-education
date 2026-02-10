export const isError = (value) => {
    return (!!value &&
        typeof value === 'object' &&
        (value instanceof Error || ('message' in value && 'name' in value)));
};
export const isXmlHttpRequest = (value) => {
    return (typeof value === 'object' &&
        value !== null &&
        'readyState' in value &&
        'status' in value &&
        'timeout' in value &&
        'upload' in value &&
        'response' in value &&
        'open' in value &&
        typeof value.open === 'function' &&
        'send' in value &&
        typeof value.send === 'function');
};
export const isProgressEvent = (value) => typeof value === 'object' &&
    !!value &&
    'target' in value &&
    isXmlHttpRequest(value.target) &&
    'loaded' in value &&
    typeof value.loaded === 'number' &&
    'total' in value &&
    typeof value.total === 'number' &&
    'lengthComputable' in value &&
    typeof value.lengthComputable === 'boolean';
export const isAbortError = (value) => {
    return value instanceof DOMException && value.name === 'AbortError';
};
export const getStackTrace = ({ skip = 1, max, myCodeOnly = true, } = {}) => {
    const originalStackFrames = new Error().stack?.split('\n') ?? [];
    let stackFrames = [...originalStackFrames];
    if (myCodeOnly && stackFrames.length > 0) {
        const mustNotInclude = [
            'node_modules',
            'internal/',
            'bootstrap_node.js',
            'webpack-runtime',
        ];
        stackFrames = stackFrames
            .filter((frame, idx, arr) => frame.trim().length > 0 &&
            (idx === arr.length - 1 ||
                idx === 0 ||
                mustNotInclude.every((x) => !frame.includes(x))))
            .map((f) => f.trim());
        if (!stackFrames.length && originalStackFrames.length) {
            stackFrames = originalStackFrames;
        }
    }
    return stackFrames?.length
        ? stackFrames.slice(skip ?? 1, max).join('\n')
        : '';
};
