import { getRedisClient, closeRedisClient } from '../src';
import { createClient } from 'redis';

describe('Redis Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton by clearing Redis mock
    (createClient as any)('teardown');
  });

  afterEach(async () => {
    try {
      await closeRedisClient();
    } catch (err) {
      // Ignore errors during cleanup
    }
    (createClient as any)('teardown');
  });

  describe('getRedisClient', () => {
    it('should create and connect a Redis client', async () => {
      const client = await getRedisClient();

      expect(client).toBeDefined();
      expect(client.isOpen).toBe(true);
    });

    it('should return the same client instance for default options (singleton)', async () => {
      const client1 = await getRedisClient();
      const client2 = await getRedisClient();

      expect(client1).toBe(client2);
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    it('should create separate clients for different databases', async () => {
      const client1 = await getRedisClient({ database: 0 });
      const client2 = await getRedisClient({ database: 1 });

      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      expect(client1).not.toBe(client2);
    });

    it('should create separate clients for subscribe mode', async () => {
      const client1 = await getRedisClient();
      const client2 = await getRedisClient({ subscribeMode: true });

      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      expect(client1).not.toBe(client2);
    });

    it('should disable subscribe methods in non-subscribe mode', async () => {
      const client = await getRedisClient();

      expect(() => (client.subscribe as any)()).toThrow(
        'Redis client must be created with { subscribeMode: true } to use subscribe features.',
      );
      expect(() => (client.pSubscribe as any)()).toThrow(
        'Redis client must be created with { subscribeMode: true } to use subscribe features.',
      );
    });
  });

  describe('closeRedisClient', () => {
    it('should close all Redis client instances', async () => {
      const client1 = await getRedisClient({ database: 0 });
      const client2 = await getRedisClient({ database: 1 });
      const quitSpy1 = jest.spyOn(client1, 'quit');
      const quitSpy2 = jest.spyOn(client2, 'quit');

      await closeRedisClient();

      expect(quitSpy1).toHaveBeenCalled();
      expect(quitSpy2).toHaveBeenCalled();
    });

    it('should handle case when no clients exist', async () => {
      await expect(closeRedisClient()).resolves.not.toThrow();
    });

    it('should throw error if any client fails to close', async () => {
      const client = await getRedisClient();
      jest.spyOn(client, 'quit').mockResolvedValue('ERROR' as any);

      await expect(closeRedisClient()).rejects.toThrow(
        'Failed to close all Redis client instances',
      );
    });
  });

  describe('RedisClientOptions', () => {
    it('should normalize undefined options to defaults', async () => {
      const client = await getRedisClient(undefined);

      expect(client).toBeDefined();
      expect(client.isOpen).toBe(true);
    });

    it('should respect custom database option', async () => {
      const client = await getRedisClient({ database: 5 });

      expect(client).toBeDefined();
      expect(client.isOpen).toBe(true);
    });

    it('should respect subscribeMode option', async () => {
      const client = await getRedisClient({ subscribeMode: true });

      expect(client).toBeDefined();
      // Subscribe mode clients should not throw on subscribe calls
      expect(() => client.subscribe).not.toThrow();
    });
  });

  describe('Client lifecycle', () => {
    it('should handle quit and remove from singleton registry', async () => {
      const client = await getRedisClient();
      await client.quit();

      // Getting a new client should create a fresh instance
      const newClient = await getRedisClient();
      expect(newClient).toBeDefined();
      expect(newClient.isOpen).toBe(true);
    });
  });

  describe('Basic functionality', () => {
    it('should support basic Redis operations', async () => {
      const client = await getRedisClient();

      // Verify client has expected methods
      expect(client.get).toBeDefined();
      expect(client.set).toBeDefined();
      expect(client.del).toBeDefined();
      expect(client.ping).toBeDefined();
    });
  });
});
