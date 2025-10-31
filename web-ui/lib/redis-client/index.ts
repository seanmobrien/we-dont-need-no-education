import { SingletonProvider } from '@/lib/typescript/singleton-provider/provider';
import { createClient, RedisClientType } from 'redis';
import { env } from '@/lib/site-util/env';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { log } from '@/lib/logger';
import AfterManager from '../site-util/after';

export type { RedisClientType } from 'redis';

const REGISTRY_KEY = Symbol.for('@noeducation/redis:RedisClient');
const SUBSCRIBABLE_REGISTRY_KEY = Symbol.for(
  '@noeducation/redis:RedisClient/subscribable',
);

export type RedisClientOptions = {
  subscribeMode?: boolean;
};

const normalizeOptions = (
  options: RedisClientOptions | undefined,
): Required<RedisClientOptions> => ({
  subscribeMode: false,
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
  const { subscribeMode } = normalizeOptions(options);
  const registryKey = subscribeMode ? SUBSCRIBABLE_REGISTRY_KEY : REGISTRY_KEY;
  return await SingletonProvider.Instance.getOrCreate(registryKey, async () => {
    let client: RedisClientType | null = createClient({
      url: env('REDIS_URL'),
      password: env('REDIS_PASSWORD'),
    });
    let promiseQuit: Promise<string> | null = null;
    const originalQuit = client.quit.bind(client);
    let onQuit: (() => Promise<void>) | undefined;
    client.quit = async (fromInternal?: Symbol) => {
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
      SingletonProvider.Instance.delete(REGISTRY_KEY);
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
      // point to where the subscribe call hanpppened, not
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
      await (client.quit as (fromInternal?: Symbol) => Promise<string>)(
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

    return await client.connect();
  });
};

export const closeRedisClient = async (): Promise<void> => {
  const client = SingletonProvider.Instance.get<
    RedisClientType,
    typeof REGISTRY_KEY
  >(REGISTRY_KEY);
  if (client) {
    const actualClient = await client;
    await actualClient.quit();
  }
};
