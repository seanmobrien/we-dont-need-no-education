export const getStackTrace = ({ skip = 1, max, myCodeOnly = true, } = {}) => {
    const originalStackFrames = new Error().stack?.split('\n') ?? [];
    let stackFrames = [...originalStackFrames];
    if (myCodeOnly && stackFrames) {
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
//# sourceMappingURL=get-stack-trace.js.map