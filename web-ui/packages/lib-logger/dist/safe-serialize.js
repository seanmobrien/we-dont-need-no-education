const getSafeSerializerOptions = (ops) => {
    const input = typeof ops === 'number' ? { maxLen: ops } : ops;
    return {
        maxLen: 200,
        maxPropertyDepth: 15,
        maxObjectDepth: 1,
        maxIterations: 5,
        currentDepth: 0,
        propertyFilter: () => true,
        parentPath: null,
        visited: new Set(),
        ...input,
    };
};
const setDisplayName = (fn, name) => {
    Object.defineProperty(fn, 'displayName', { value: name, writable: false });
    return fn;
};
const safeSerializeImpl = (v, options) => {
    const opsFromProps = getSafeSerializerOptions(options);
    const { maxLen = 200, maxPropertyDepth = 10, currentDepth = 0, maxObjectDepth = 0, visited = new Set(), } = opsFromProps;
    try {
        const applyMaxLength = (s, theMaxLen = maxLen) => {
            let actualMaxLen;
            if (isNaN(theMaxLen)) {
                actualMaxLen = opsFromProps.maxLen
                    ?
                        opsFromProps.maxLen
                    :
                        7000 / (currentDepth + 1);
            }
            else {
                actualMaxLen = theMaxLen;
            }
            const checkValue = String(s);
            return checkValue.length > actualMaxLen
                ? `${checkValue.slice(0, actualMaxLen)}...`
                : checkValue;
        };
        if (v === null || v === undefined)
            return String(v);
        const t = typeof v;
        if (t === 'string' || t === 'number' || t === 'boolean') {
            return applyMaxLength(v);
        }
        if (Array.isArray(v)) {
            return `[Array length=${v.length}]`;
        }
        if (v instanceof Error) {
            if (visited.has(v)) {
                return '[circular]';
            }
            visited.add(v);
            return applyMaxLength(`${v.name}: ${v.message}`, NaN);
        }
        if (t === 'object') {
            if (visited.has(v)) {
                return '[circular]';
            }
            try {
                const obj = v;
                const objKeys = Object.keys(obj);
                if (currentDepth >= maxObjectDepth) {
                    return applyMaxLength(`{${objKeys.join(',')}}`);
                }
                const keys = objKeys.slice(0, maxPropertyDepth);
                const parentPath = opsFromProps.parentPath
                    ? `${opsFromProps.parentPath}.`
                    : '';
                const SkipProperties = [
                    'password',
                    'authorization',
                    'token',
                    'accesskey',
                    'secret',
                    'apikey',
                ];
                return applyMaxLength(JSON.stringify(keys.reduce((acc, key) => {
                    const propertyPath = parentPath + key;
                    if (!opsFromProps.propertyFilter(key, propertyPath) ||
                        SkipProperties.includes(key?.toLowerCase())) {
                        return acc;
                    }
                    const value = obj[key];
                    if (value !== undefined && value !== null) {
                        if (visited.has(value)) {
                            acc[key] = '[circular]';
                        }
                        else {
                            acc[key] = safeSerializeImpl(value, {
                                ...opsFromProps,
                                currentDepth: currentDepth + 1,
                                parentPath: propertyPath,
                                visited,
                            });
                        }
                    }
                    return acc;
                }, {})), NaN);
            }
            finally {
                visited.add(v);
            }
        }
        return applyMaxLength(String(v));
    }
    catch {
        return '[unserializable]';
    }
};
const safeServerDescriptor = (srv) => {
    try {
        const s = srv;
        const serverObj = s['server'];
        const transport = serverObj
            ? serverObj['transport']
            : undefined;
        const transportType = transport &&
            typeof transport['type'] === 'string'
            ? transport['type']
            : null;
        const transportUrl = transport &&
            typeof transport['url'] === 'string'
            ? transport['url']
            : null;
        return {
            basePath: serverObj && typeof serverObj['basePath'] === 'string'
                ? safeSerialize(serverObj['basePath'])
                : safeSerialize(s['basePath'] ?? null),
            transportType,
            transportUrl,
        };
    }
    catch {
        return { basePath: null, transportType: null, transportUrl: null };
    }
};
safeSerializeImpl.serverDescriptor = setDisplayName(safeServerDescriptor, 'serverDescriptor');
export const safeArgsSummary = (args, options) => {
    if (!args) {
        return '[null/undefined]';
    }
    const ops = getSafeSerializerOptions(options);
    return Array.isArray(args)
        ? args
            .slice(0, ops.maxIterations)
            .map((a) => safeSerialize(a, ops))
            .join(', ')
        : safeSerialize(String(args));
};
safeSerializeImpl.argsSummary = setDisplayName(safeArgsSummary, 'argsSummary');
export const safeSerialize = safeSerializeImpl;
