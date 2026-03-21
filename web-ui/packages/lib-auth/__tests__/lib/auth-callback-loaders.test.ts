jest.mock('../../src/lib/jwt', () => ({
  jwt: jest.fn(async ({ token }) => ({ ...token, source: 'node-jwt' })),
}));

import { authCallbackLoaderSpecs } from '../../src/lib/auth-callback-loaders';
import type { JWT } from '@compliance-theater/auth-compat';

describe('auth callback loader specs', () => {
  describe('jwt loader', () => {
    it('uses the edge callback without importing the server jwt module', async () => {
      const module = await authCallbackLoaderSpecs.jwt.loaders.edge?.();
      const token = { sub: '123' } as JWT;

      const result = await module?.jwt({
        token,
        user: {
          id: 'user-1',
          account_id: '42',
        },
      } as never);

      expect(result).toMatchObject({
        sub: '123',
        id: 'user-1',
        account_id: 42,
      });
    });

    it('uses the node jwt module for node runtime', async () => {
      const module = await authCallbackLoaderSpecs.jwt.loaders.node?.();
      const token = { sub: 'abc' } as JWT;

      const result = await module?.jwt({
        token,
        user: {
          id: 'user-2',
        },
      } as never);

      expect(result).toMatchObject({
        sub: 'abc',
        source: 'node-jwt',
      });
    });
  });

  describe('session loader', () => {
    it('has distinct node and edge implementations configured', () => {
      expect(typeof authCallbackLoaderSpecs.session.loaders.node).toBe(
        'function',
      );
      expect(typeof authCallbackLoaderSpecs.session.loaders.edge).toBe(
        'function',
      );
    });
  });
});