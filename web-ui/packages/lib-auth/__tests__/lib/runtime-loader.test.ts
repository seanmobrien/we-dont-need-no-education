import {
  createCachedModuleLoader,
  ensureRuntimeModule,
  resolveRuntimeTarget,
} from '../../src/lib/runtime-loader';

describe('runtime-loader', () => {
  describe('resolveRuntimeTarget', () => {
    it('returns browser when window is available', () => {
      expect(resolveRuntimeTarget({ hasWindow: true, isEdge: false })).toBe(
        'browser',
      );
    });

    it('returns edge for server-side edge runtime', () => {
      expect(resolveRuntimeTarget({ hasWindow: false, isEdge: true })).toBe(
        'edge',
      );
    });

    it('returns node for server-side node runtime', () => {
      expect(resolveRuntimeTarget({ hasWindow: false, isEdge: false })).toBe(
        'node',
      );
    });
  });

  describe('ensureRuntimeModule', () => {
    it('reuses the current module when it is already valid', async () => {
      const current = { value: 'existing' };
      const loader = jest.fn(async () => ({ value: 'loaded' }));

      const result = await ensureRuntimeModule({
        label: 'test module',
        runtime: 'node',
        current,
        spec: {
          loaders: { node: loader },
          isValid: (value) => !!value?.value,
        },
      });

      expect(result).toBe(current);
      expect(loader).not.toHaveBeenCalled();
    });

    it('falls back to the default loader when the runtime loader is missing', async () => {
      const result = await ensureRuntimeModule({
        label: 'test module',
        runtime: 'browser',
        current: undefined,
        spec: {
          loaders: {
            default: async () => ({ value: 'default' }),
          },
          isValid: (value) => !!value?.value,
        },
      });

      expect(result).toEqual({ value: 'default' });
    });

    it('throws when no loader exists for a runtime', async () => {
      await expect(
        ensureRuntimeModule({
          label: 'missing module',
          runtime: 'browser',
          current: undefined,
          spec: {
            loaders: {},
          },
        }),
      ).rejects.toThrow('No missing module implementation for runtime: browser');
    });
  });

  describe('createCachedModuleLoader', () => {
    it('loads the module only once', async () => {
      const loader = jest.fn(async () => ({ value: 'cached' }));
      const cachedLoader = createCachedModuleLoader(loader);

      const first = await cachedLoader();
      const second = await cachedLoader();

      expect(first).toBe(second);
      expect(loader).toHaveBeenCalledTimes(1);
    });
  });
});