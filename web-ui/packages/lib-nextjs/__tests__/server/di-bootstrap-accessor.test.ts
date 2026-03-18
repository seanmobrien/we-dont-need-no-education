/* @jest-environment node */

/**
 * Tests for di-bootstrap-accessor
 */

import {
  configureServerRequestBootstrap,
  runServerRequestBootstrap,
} from '../../src/server/di-bootstrap-accessor';

const ACCESSOR_KEY = Symbol.for(
  '@compliance-theater/nextjs/server/di-bootstrap-accessor',
);

describe('di-bootstrap-accessor', () => {
  beforeEach(() => {
    // Clean up globalThis between tests
    delete (globalThis as any)[ACCESSOR_KEY];
  });

  afterAll(() => {
    delete (globalThis as any)[ACCESSOR_KEY];
  });

  describe('configureServerRequestBootstrap', () => {
    it('stores accessor on globalThis', () => {
      const accessor = jest.fn();
      configureServerRequestBootstrap(accessor);
      expect((globalThis as any)[ACCESSOR_KEY]).toBe(accessor);
    });

    it('overwrites previously stored accessor', () => {
      const first = jest.fn();
      const second = jest.fn();
      configureServerRequestBootstrap(first);
      configureServerRequestBootstrap(second);
      expect((globalThis as any)[ACCESSOR_KEY]).toBe(second);
    });
  });

  describe('runServerRequestBootstrap', () => {
    it('calls the configured accessor', async () => {
      const accessor = jest.fn().mockResolvedValue(undefined);
      configureServerRequestBootstrap(accessor);
      await runServerRequestBootstrap();
      expect(accessor).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no accessor is configured', async () => {
      // No accessor set → should resolve without error
      await expect(runServerRequestBootstrap()).resolves.toBeUndefined();
    });

    it('awaits async accessor', async () => {
      let resolved = false;
      const accessor = async () => {
        await new Promise((r) => setTimeout(r, 10));
        resolved = true;
      };
      configureServerRequestBootstrap(accessor);
      await runServerRequestBootstrap();
      expect(resolved).toBe(true);
    });

    it('propagates errors from accessor', async () => {
      const accessor = jest.fn().mockRejectedValue(new Error('bootstrap failed'));
      configureServerRequestBootstrap(accessor);
      await expect(runServerRequestBootstrap()).rejects.toThrow('bootstrap failed');
    });
  });
});
