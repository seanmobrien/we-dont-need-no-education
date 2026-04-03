import { isRunningOnEdge } from '@compliance-theater/env';

export type RuntimeTarget = 'node' | 'edge' | 'browser';

export type RuntimeLoaders<T> =
  Partial<Record<RuntimeTarget, () => Promise<T>>> & {
    default?: () => Promise<T>;
  };

export type LoaderSpec<T> = {
  loaders: RuntimeLoaders<T>;
  isValid?: (value: T | undefined) => boolean;
};

export const resolveRuntimeTarget = (props: {
  hasWindow: boolean;
  isEdge: boolean;
}): RuntimeTarget => {
  const { hasWindow, isEdge } = props;

  if (hasWindow) {
    return 'browser';
  }

  return isEdge ? 'edge' : 'node';
};

export const getRuntimeTarget = (): RuntimeTarget =>
  resolveRuntimeTarget({
    hasWindow: typeof window !== 'undefined',
    isEdge: isRunningOnEdge(),
  });

export const ensureRuntimeModule = async <T>(props: {
  label: string;
  runtime: RuntimeTarget;
  current: T | undefined;
  spec: LoaderSpec<T>;
}): Promise<T> => {
  const { label, runtime, current, spec } = props;

  if (spec.isValid?.(current) ?? !!current) {
    return current as T;
  }

  const loader = spec.loaders[runtime] ?? spec.loaders.default;
  if (!loader) {
    throw new Error(`No ${label} implementation for runtime: ${runtime}`);
  }

  const loaded = await loader();
  if (!(spec.isValid?.(loaded) ?? !!loaded)) {
    throw new Error(`Failed to load ${label}`);
  }

  return loaded;
};

export const createCachedModuleLoader = <T>(
  loader: () => Promise<T>,
): (() => Promise<T>) => {
  let cached: Promise<T> | undefined;

  return () => {
    cached ??= loader();
    return cached;
  };
};