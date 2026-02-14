import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import { createClient } from 'redis';
import { env } from '@compliance-theater/env';
import { LoggedError, log } from '@compliance-theater/logger';
import AfterManager from '@compliance-theater/after';
const REGISTRY_KEY = Symbol.for('@noeducation/redis:RedisClient');
const SUBSCRIBABLE_REGISTRY_KEY = Symbol.for('@noeducation/redis:RedisClient/subscribable');
const normalizeOptions = (options) => ({
    subscribeMode: false,
    database: 0,
    ...(options ?? {}),
});
const subsribeModelDisabled = () => {
    throw new TypeError('Redis client must be created with { subscribeMode: true } to use subscribe features.');
};
export const getRedisClient = async (options) => {
    const { subscribeMode, database } = normalizeOptions(options);
    const registryKey = subscribeMode ? SUBSCRIBABLE_REGISTRY_KEY : REGISTRY_KEY;
    const clientFactory = () => {
        let client = createClient({
            url: env('REDIS_URL'),
            password: env('REDIS_PASSWORD'),
            database,
        });
        let promiseQuit = null;
        const originalQuit = client.quit.bind(client);
        let onQuit;
        client.quit = async (fromInternal) => {
            if (!client) {
                if (!promiseQuit) {
                    log((l) => l.error('Null client but no quit promise found - no wait context available.'));
                    return 'No client to quit.';
                }
                return promiseQuit;
            }
            client = null;
            const innerDatabases = SingletonProvider.Instance.get(registryKey);
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
            }
            catch (err) {
                return LoggedError.isTurtlesAllTheWayDownBaby(err, {
                    log: true,
                    source: 'redis-client::on-quit',
                }).toString();
            }
        };
        if (!subscribeMode) {
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
            await client.quit(REGISTRY_KEY);
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
    const databases = await SingletonProvider.Instance.getRequiredAsync(registryKey, async () => {
        const client = await clientFactory();
        if (!client || !client.isOpen) {
            throw new TypeError('Failed to create or connect to Redis client');
        }
        return new Map([[database, client]]);
    });
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
export const closeRedisClient = async () => {
    const getInstanceMaps = (key) => {
        const clientMap = SingletonProvider.Instance.get(key);
        if (!clientMap) {
            return [];
        }
        return Array.from(clientMap.values());
    };
    const results = await Promise.allSettled([
        ...getInstanceMaps(REGISTRY_KEY),
        ...getInstanceMaps(SUBSCRIBABLE_REGISTRY_KEY),
    ].map((client) => client.quit()));
    if (!results.every((r) => r.status === 'fulfilled' && r.value === 'OK')) {
        throw new TypeError('Failed to close all Redis client instances');
    }
};
//# sourceMappingURL=index.js.map