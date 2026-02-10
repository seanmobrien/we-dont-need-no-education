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
const isErrorLike = (val) => {
    if (!val || typeof val !== 'object')
        return false;
    const obj = val;
    return typeof obj['message'] === 'string';
};
const extractDbError = (val) => {
    if (!val || typeof val !== 'object')
        return undefined;
    const e = val;
    if (e.name === 'PostgresError')
        return val;
    const fromCause = extractDbError(e.cause);
    return fromCause ? fromCause : extractDbError(e.error);
};
export const getDbError = (error) => extractDbError(error);
export const errorLogFactory = ({ error, source, include, message: messageFromProps, ...params }) => {
    const ret = {
        source,
        ...(include ?? {}),
        ...(params ?? {}),
    };
    if (typeof error === 'string') {
        return errorLogFactory({
            error: { message: error },
            message: messageFromProps,
            source,
            include,
            ...params,
        });
    }
    const defaultError = 'An unexpected error occurred.';
    if (isErrorLike(error)) {
        const stack = typeof error['stack'] === 'string'
            ? (error['stack']?.toString() ?? getStackTrace({ skip: 2 }))
            : '';
        const message = messageFromProps
            ? `${messageFromProps}: ${error['message']?.toString() ?? defaultError}`
            : error['message']?.toString() ?? defaultError;
        let loggedError = {
            message,
            stack,
            ...('cause' in error &&
                typeof error['cause'] === 'object' &&
                error['cause'] !== null
                ? { cause: JSON.stringify(error['cause']) }
                : {}),
        };
        const dbError = getDbError(error);
        if (dbError) {
            loggedError = {
                ...loggedError,
                name: 'name' in dbError ? dbError.name : undefined,
                code: dbError.code,
                detail: dbError.detail,
                severity: dbError.severity,
                internalQuery: dbError.query ?? dbError.internal_query ?? dbError.internalQuery,
                where: dbError.where,
                schema: dbError.schema_name ?? dbError.schema,
                table: dbError.table_name ?? dbError.table,
                column: dbError.column_name ?? dbError.column,
                cause: dbError.cause,
            };
        }
        ret.error = loggedError;
        ret.message = loggedError.message;
    }
    else {
        ret.error = JSON.stringify(error ?? 'null');
        ret.message ??= (messageFromProps ?? defaultError);
    }
    if (!ret.severity) {
        ret.severity = 'error';
    }
    if (ret.error &&
        typeof ret.error === 'object' &&
        Object.keys(ret.error).length === 0) {
        ret.error = {
            message: typeof ret.context === 'object' &&
                ret.context &&
                'message' in ret.context &&
                ret.context
                ? (ret.context.message ?? defaultError)
                : defaultError,
        };
    }
    return ret;
};
