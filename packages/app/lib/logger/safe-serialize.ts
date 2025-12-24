type SafeSerializeOptions = {
  maxLen?: number;
  maxPropertyDepth?: number;
  maxObjectDepth?: number;
  maxIterations?: number;
  currentDepth?: number;
  propertyFilter?: (key: string, path: string) => boolean;
  parentPath?: string | null;
  visited?: Set<unknown>;
};

type SafeServerDescriptor = {
  basePath: string | null;
  transportType: string | null;
  transportUrl: string | null;
};

type SafeSerialize = {
  (v: unknown, options?: SafeSerializeOptions | number): string;
  serverDescriptor: (
    srv: unknown,
    options?: SafeSerializeOptions,
  ) => SafeServerDescriptor;
  argsSummary: (args: unknown[], options?: SafeSerializeOptions) => string;
};

const getSafeSerializerOptions = (
  ops: SafeSerializeOptions | number | undefined,
): Required<SafeSerializeOptions> => {
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

const setDisplayName = <TArgs extends unknown[], TRet>(
  fn: (...args: TArgs) => TRet,
  name: string,
): ((...args: TArgs) => TRet) => {
  Object.defineProperty(fn, 'displayName', { value: name, writable: false });
  return fn;
};

const safeSerializeImpl = (
  v: unknown,
  options?: SafeSerializeOptions | number,
) => {
  const opsFromProps = getSafeSerializerOptions(options);
  const {
    maxLen = 200,
    maxPropertyDepth = 10,
    currentDepth = 0,
    maxObjectDepth = 0,
    visited = new Set(),
  } = opsFromProps;
  try {
    const applyMaxLength = (s: unknown, theMaxLen: number = maxLen) => {
      let actualMaxLen: number;
      // If we were explicitly passed NaN
      if (isNaN(theMaxLen)) {
        // But were explicitly passed a maxLen
        actualMaxLen = opsFromProps.maxLen
          // Then use that maxLen
          ? opsFromProps.maxLen
          // Otherwise, use 7000 chars / the current depth; truncated properties lead to shorter objects.
          : 7000 / (currentDepth + 1);
      } else {
        // Otherwise, use the maxLen passed in with standard defaults
        actualMaxLen = theMaxLen;
      }
      const checkValue = String(s);
      return checkValue.length > actualMaxLen
        ? `${checkValue.slice(0, actualMaxLen)}...`
        : checkValue;
    };
    if (v === null || v === undefined) return String(v);
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      return applyMaxLength(v);
    }
    if (Array.isArray(v)) {
      // TODO: consider serializing a couple of the array items...
      return `[Array length=${v.length}]`;
    }
    if (v instanceof Error) {
      // Errors can be circular, so check for that
      if (visited.has(v)) {
        return '[circular]';
      }
      visited.add(v);
      // Message can be insanely long, so use object-style maxLen with backoff
      return applyMaxLength(`${v.name}: ${v.message}`, NaN);
    }
    // For objects, return keys only (first maxDepth) to avoid deep traversal
    if (t === 'object') {
      if (visited.has(v)) {
        return '[circular]';
      }
      try {
        const obj = v as Record<string, unknown>;
        const objKeys = Object.keys(obj);
        // If we've reached max object depth, don't traverse further
        if (currentDepth >= maxObjectDepth) {
          return applyMaxLength(`{${objKeys.join(',')}}`);
        }
        const keys = objKeys.slice(0, maxPropertyDepth);
        // Serialize each property recursively.
        const parentPath = opsFromProps.parentPath ? `${opsFromProps.parentPath}.` : '';
        // Let applyMaxLength handle truncation using the object-style maxLen with backoff
        return applyMaxLength(JSON.stringify(
          keys.reduce(
            (acc, key) => {
              // Skip properties that don't match the filter
              const propertyPath = parentPath + key;
              if (!opsFromProps.propertyFilter(key, propertyPath)) {
                return acc;
              }
              const value = obj[key];
              // Save serialization space by skipping undefined and null values
              if (value !== undefined && value !== null) {
                if (visited.has(value)) {
                  acc[key] = '[circular]';
                } else {
                  // Recursively serialize the child property with circular reference protection
                  acc[key] = safeSerializeImpl(value, {
                    ...opsFromProps,
                    currentDepth: currentDepth + 1,
                    parentPath: propertyPath,
                    visited,
                  });
                }
              }
              return acc;
            },
            {} as Record<string, unknown>,
          ),
        ), NaN);
      } finally {
        visited.add(v);
      }
    }
    // Let applyMaxLength handle truncation using the default maxLen
    return applyMaxLength(String(v));
  } catch {
    return '[unserializable]';
  }
};

const safeServerDescriptor = (srv: unknown) => {
  try {
    const s = srv as unknown as Record<string, unknown>;
    const serverObj = s['server'] as unknown as
      | Record<string, unknown>
      | undefined;
    const transport = serverObj
      ? (serverObj['transport'] as unknown)
      : undefined;
    const transportType =
      transport &&
        typeof (transport as Record<string, unknown>)['type'] === 'string'
        ? ((transport as Record<string, unknown>)['type'] as string)
        : null;
    const transportUrl =
      transport &&
        typeof (transport as Record<string, unknown>)['url'] === 'string'
        ? ((transport as Record<string, unknown>)['url'] as string)
        : null;
    return {
      basePath:
        serverObj && typeof serverObj['basePath'] === 'string'
          ? safeSerialize(serverObj['basePath'] as string)
          : safeSerialize(s['basePath'] ?? null),
      transportType,
      transportUrl,
      // avoid including the full server object
    };
  } catch {
    return { basePath: null, transportType: null, transportUrl: null };
  }
};

safeSerializeImpl.serverDescriptor = setDisplayName(
  safeServerDescriptor,
  'serverDescriptor',
);

export const safeArgsSummary = (
  args: unknown[],
  options?: SafeSerializeOptions,
): string => {
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

export const safeSerialize: SafeSerialize = safeSerializeImpl;
