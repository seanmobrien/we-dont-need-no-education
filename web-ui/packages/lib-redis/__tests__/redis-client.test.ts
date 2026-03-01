import { getRedisClient, closeRedisClient } from '../src';
import { createClient } from 'redis';
import * as loggerModule from '@compliance-theater/logger';
import AfterManager from '@compliance-theater/after';
import { SingletonProvider } from '@compliance-theater/logger/singleton-provider/provider';

describe('Redis Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SingletonProvider.Instance.clear();
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
    SingletonProvider.Instance.clear();
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

    it('invokes registered event handlers for error/connect/reconnecting/ready', async () => {
      const logSpy = jest
        .spyOn(loggerModule, 'log')
        .mockImplementation((callback: (logger: {
          error: (message: string) => void;
          info: (message: string) => void;
          warn: (message: string) => void;
        }) => void) => {
          callback({
            error: () => {
              // no-op
            },
            info: () => {
              // no-op
            },
            warn: () => {
              // no-op
            },
          });
        });
      const turtlesSpy = jest
        .spyOn(loggerModule.LoggedError, 'isTurtlesAllTheWayDownBaby')
        .mockImplementation((err) => err as Error);

      const client = await getRedisClient({ database: 31 });
      const onCalls = (client.on as unknown as jest.Mock).mock.calls;
      const getListener = (eventName: string) =>
        onCalls.find(([event]: [string]) => event === eventName)?.[1] as
        | ((...args: unknown[]) => unknown)
        | undefined;

      const errorListener = getListener('error');
      const connectListener = getListener('connect');
      const reconnectingListener = getListener('reconnecting');
      const readyListener = getListener('ready');

      expect(errorListener).toBeDefined();
      expect(connectListener).toBeDefined();
      expect(reconnectingListener).toBeDefined();
      expect(readyListener).toBeDefined();

      errorListener?.(new Error('redis-err'));
      connectListener?.();
      reconnectingListener?.();
      readyListener?.();

      expect(turtlesSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledTimes(3);
    });

    it('waits for promiseQuit in process-exit callback when client already quit', async () => {
      let capturedOnQuit: (() => Promise<void>) | undefined;
      const processExitSpy = jest
        .spyOn(AfterManager, 'processExit')
        .mockImplementation((handler: () => Promise<void>) => {
          capturedOnQuit = handler;
        });

      const client = await getRedisClient({ database: 32 });
      await client.quit();
      await capturedOnQuit?.();

      expect(processExitSpy).toHaveBeenCalled();
      expect(capturedOnQuit).toBeDefined();
    });

    it('returns early in process-exit callback when client is null and no quit promise exists', async () => {
      let capturedOnQuit: (() => Promise<void>) | undefined;
      jest.spyOn(AfterManager, 'processExit').mockImplementation((handler: () => Promise<void>) => {
        capturedOnQuit = handler;
      });

      const turtlesSpy = jest
        .spyOn(loggerModule.LoggedError, 'isTurtlesAllTheWayDownBaby')
        .mockReturnValue({ toString: () => 'logged-quit-error' } as unknown as Error);

      const failingClient = {
        isOpen: true,
        quit: jest.fn(() => {
          throw new Error('quit-failed');
        }),
        connect: jest.fn(async function () {
          return this;
        }),
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        pSubscribe: jest.fn(),
        unsubscribe: jest.fn(),
        pUnsubscribe: jest.fn(),
      };

      (createClient as unknown as jest.Mock).mockImplementationOnce(() => failingClient);

      const client = await getRedisClient({ database: 36 });
      await client.quit();
      await capturedOnQuit?.();

      expect(turtlesSpy).toHaveBeenCalled();
      expect(capturedOnQuit).toBeDefined();
    });

    it('handles quit failures and then handles second quit with null client/no promise context', async () => {
      const logSpy = jest
        .spyOn(loggerModule, 'log')
        .mockImplementation((callback: (logger: { error: (message: string) => void }) => void) => {
          callback({
            error: () => {
              // no-op
            },
          });
        });
      const turtlesSpy = jest
        .spyOn(loggerModule.LoggedError, 'isTurtlesAllTheWayDownBaby')
        .mockReturnValue({ toString: () => 'logged-quit-error' } as unknown as Error);

      const failingClient = {
        isOpen: true,
        quit: jest.fn(() => {
          throw new Error('quit-failed');
        }),
        connect: jest.fn(async function () {
          return this;
        }),
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        pSubscribe: jest.fn(),
        unsubscribe: jest.fn(),
        pUnsubscribe: jest.fn(),
      };

      (createClient as unknown as jest.Mock).mockImplementationOnce(
        () => failingClient,
      );

      const client = await getRedisClient({ database: 33 });
      const firstQuit = await client.quit();
      const secondQuit = await client.quit();

      expect(firstQuit).toBe('logged-quit-error');
      expect(secondQuit).toBe('No client to quit.');
      expect(turtlesSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalled();
    });

    it('throws when created client is not open in initial map factory path', async () => {
      const unopenedClient = {
        isOpen: false,
        quit: jest.fn(async () => 'OK'),
        connect: jest.fn(async function () {
          return this;
        }),
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        pSubscribe: jest.fn(),
        unsubscribe: jest.fn(),
        pUnsubscribe: jest.fn(),
      };

      (createClient as unknown as jest.Mock).mockImplementationOnce(
        () => unopenedClient,
      );

      await expect(getRedisClient({ database: 34 })).rejects.toThrow(
        'Failed to create or connect to Redis client',
      );
    });

    it('throws when a missing database requires a new unopened client', async () => {
      await getRedisClient({ database: 0 });

      const unopenedClient = {
        isOpen: false,
        quit: jest.fn(async () => 'OK'),
        connect: jest.fn(async function () {
          return this;
        }),
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        pSubscribe: jest.fn(),
        unsubscribe: jest.fn(),
        pUnsubscribe: jest.fn(),
      };

      (createClient as unknown as jest.Mock).mockImplementationOnce(
        () => unopenedClient,
      );

      await expect(getRedisClient({ database: 35 })).rejects.toThrow(
        'Failed to create or connect to Redis client',
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
