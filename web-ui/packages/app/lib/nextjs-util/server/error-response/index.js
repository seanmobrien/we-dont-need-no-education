import { isError } from '@compliance-theater/logger';
const normalizeArg = (arg) => {
    if (arg == null)
        return {};
    if (typeof arg === 'string')
        return { message: arg };
    if (typeof arg === 'number')
        return { status: arg };
    if (typeof Response !== 'undefined' && arg instanceof Response) {
        const status = arg.status;
        const message = arg.statusText || `HTTP ${status}`;
        return { status, message };
    }
    if (isError(arg))
        return { cause: arg, message: arg.message };
    if (typeof arg === 'object') {
        const obj = {
            ...arg,
        };
        return obj;
    }
    return {};
};
export const parseResponseOptions = (first, second) => {
    const a = normalizeArg(first);
    const b = normalizeArg(second);
    const merged = { ...a, ...b };
    const status = typeof merged.status === 'number' ? merged.status : 500;
    const aMsg = typeof a.message === 'string' && a.message.length > 0
        ? a.message
        : undefined;
    const bMsg = typeof b.message === 'string' && b.message.length > 0
        ? b.message
        : undefined;
    const combined = aMsg && bMsg ? `${aMsg} - ${bMsg}` : (bMsg ?? aMsg);
    const message = combined && combined.length > 0 ? combined : 'An error occurred';
    const hasSource = (val) => {
        return (typeof val === 'object' &&
            val !== null &&
            'source' in val);
    };
    let source;
    if (typeof merged.source === 'string')
        source = merged.source;
    else if (merged.cause && hasSource(merged.cause)) {
        const s = merged.cause.source;
        source = s != null ? String(s) : undefined;
    }
    let cause;
    if (merged.cause !== undefined) {
        cause = isError(merged.cause)
            ? merged.cause.name
            : String(merged.cause);
    }
    return {
        status,
        message,
        ...(source ? { source } : {}),
        ...(cause ? { cause } : {}),
    };
};
export const errorResponseFactory = (statusOrError, messageOrOptions) => {
    const opts = parseResponseOptions(statusOrError, messageOrOptions);
    return Response.json({
        error: opts.message,
        status: opts.status,
        cause: opts.cause,
    }, {
        status: opts.status,
        headers: { 'Content-Type': 'application/json' },
    });
};
//# sourceMappingURL=index.js.map