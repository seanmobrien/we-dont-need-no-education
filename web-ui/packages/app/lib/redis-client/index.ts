import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import { createClient, type RedisClientType } from 'redis';
import { env } from '@compliance-theater/env';
import { LoggedError, log } from '@compliance-theater/logger';
import AfterManager from '@compliance-theater/after';

export type { RedisClientType };

const REGISTRY_KEY = Symbol.for('@noeducation/redis:RedisClient');
const SUBSCRIBABLE_REGISTRY_KEY = Symbol.for(
  '@noeducation/redis:RedisClient/subscribable',
);

export type RedisClientOptions = {
  subscribeMode?: boolean;
  database?: number;
};

const normalizeOptions = (
  options: RedisClientOptions | undefined,
): Required<RedisClientOptions> => ({
  subscribeMode: false,
  database: 0,
  ...(options ?? {}),
});

const subsribeModelDisabled = () => {
  throw new TypeError(
    'Redis client must be created with { subscribeMode: true } to use subscribe features.',
  );
};

export const getRedisClient = async (
  options?: RedisClientOptions,
): Promise<RedisClientType> => {
  const { subscribeMode, database } = normalizeOptions(options);
  const registryKey = subscribeMode ? SUBSCRIBABLE_REGISTRY_KEY : REGISTRY_KEY;
  const clientFactory = () => {
    let client: RedisClientType | null = createClient({
      url: env('REDIS_URL'),
      password: env('REDIS_PASSWORD'),
      database,
    });
    let promiseQuit: Promise<string> | null = null;
    const originalQuit = client.quit.bind(client);
    let onQuit: (() => Promise<void>) | undefined;
    client.quit = async (fromInternal?: symbol) => {
      if (!client) {
        if (!promiseQuit) {
          log((l) =>
            l.error(
              'Null client but no quit promise found - no wait context available.',
            ),
          );
          return 'No client to quit.';
        }
        return promiseQuit;
      }
      client = null;
      const innerDatabases: Map<number, RedisClientType> | undefined =
        SingletonProvider.Instance.get<
          Map<number, RedisClientType>,
          typeof registryKey
        >(registryKey);
      if (innerDatabases) {
        innerDatabases.delete(database);
        if (innerDatabases.size === 0) {
          SingletonProvider.Instance.delete(registryKey);
        }
      }
      if (onQuit && fromInternal !== REGISTRY_KEY) {
        AfterManager.getInstance().remove('teardown', onQuit);
        onQuit = undefined;
      }
      try {
        promiseQuit = originalQuit();
        return await promiseQuit;
      } catch (err) {
        return LoggedError.isTurtlesAllTheWayDownBaby(err, {
          log: true,
          source: 'redis-client::on-quit',
        }).toString();
      }
    };

    if (!subscribeMode) {
      // Disable subscribe methods - this ensures error stack traces
      // point to where the subscribe call happened, not
      client.subscribe = subsribeModelDisabled;
      client.pSubscribe = subsribeModelDisabled;
      client.unsubscribe = subsribeModelDisabled;
      client.pUnsubscribe = subsribeModelDisabled;
    }

    onQuit = async () => {
      if (!client) {
        if (promiseQuit) {
          await promiseQuit;
        }
        return;
      }
      await (client.quit as (fromInternal?: symbol) => Promise<string>)(
        REGISTRY_KEY,
      );
    };
    AfterManager.processExit(onQuit);

    client
      .on('error', (err) => {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
          message: 'Redis client error',
          data: {
            redisUrl: env('REDIS_URL'),
          },
          source: 'redis-client',
          log: true,
        });
      })
      .on('connect', () => {
        log((l) => l.info('Redis client connected'));
      })
      .on('reconnecting', () => {
        log((l) => l.warn('Redis client reconnecting'));
      })
      .on('ready', () => {
        log((l) => l.info('Redis client ready'));
      });

    return client.connect();
  };
  const databases = await SingletonProvider.Instance.getRequiredAsync(
    registryKey,
    async () => {
      const client = await clientFactory();
      if (!client || !client.isOpen) {
        throw new TypeError('Failed to create or connect to Redis client');
      }
      return new Map<number, RedisClientType>([[database, client]]);
    },
  );
  let requestedInstance = databases.get(database);
  if (!requestedInstance) {
    requestedInstance = await clientFactory();
    if (!requestedInstance || !requestedInstance.isOpen) {
      throw new TypeError('Failed to create or connect to Redis client');
    }
    databases.set(database, requestedInstance);
  }
  return requestedInstance;
};

export const closeRedisClient = async (): Promise<void> => {
  const getInstanceMaps = (
    key: typeof REGISTRY_KEY | typeof SUBSCRIBABLE_REGISTRY_KEY,
  ) => {
    const clientMap = SingletonProvider.Instance.get(key) as Map<
      number,
      RedisClientType
    >;
    if (!clientMap) {
      return [];
    }
    return Array.from(clientMap.values()) as Array<RedisClientType>;
  };
  const results = await Promise.allSettled(
    [
      ...getInstanceMaps(REGISTRY_KEY),
      ...getInstanceMaps(SUBSCRIBABLE_REGISTRY_KEY),
    ].map((client) => client.quit()),
  );
  if (!results.every((r) => r.status === 'fulfilled' && r.value === 'OK')) {
    throw new TypeError('Failed to close all Redis client instances');
  }
};
