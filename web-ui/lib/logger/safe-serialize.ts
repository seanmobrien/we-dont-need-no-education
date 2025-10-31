type SafeSerializeOptions = {
  maxLen?: number;
  maxPropertyDepth?: number;
  maxObjectDepth?: number;
  maxIterations?: number;
  currentDepth?: number;
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
    maxPropertyDepth: 10,
    maxObjectDepth: 1,
    maxIterations: 5,
    currentDepth: 0,
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
  } = opsFromProps;
  try {
    if (v === null || v === undefined) return String(v);
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return String(v);
    if (Array.isArray(v)) return `[Array length=${v.length}]`;
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    // For objects, return keys only (first maxDepth) to avoid deep traversal
    if (t === 'object') {
      const obj = v as Record<string, unknown>;
      const keys = Object.keys(obj).slice(0, maxPropertyDepth);
      // If we've reached max object depth, don't traverse further
      if (currentDepth >= maxObjectDepth) {
        return `{${keys.join(',')}}`;
      }
      // Otherwise, serialize each property recursively
      return JSON.stringify(
        keys.reduce(
          (acc, key) => {
            acc[key] = safeSerializeImpl(obj[key], {
              ...opsFromProps,
              currentDepth: currentDepth + 1,
            });
            return acc;
          },
          {} as Record<string, unknown>,
        ),
      );
    }
    return String(v).slice(0, maxLen);
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
