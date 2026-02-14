// Mock Redis client for cache tests

type RedisClientMock = {
  ping: jest.Mock<Promise<string>, []>;
  connect: jest.Mock<Promise<RedisClientMock>, []>;
  quit: jest.Mock<Promise<string>, []>;
  get: jest.Mock<Promise<string | null>, [key: string]>;
  set: jest.Mock<Promise<'OK'>, [key: string, value: string, options?: any]>;
  setEx: jest.Mock<Promise<'OK'>, [key: string, value: string, expire: number]>;
  del: jest.Mock<Promise<number>, [keys: string | string[]]>;
  mGet: jest.Mock<Promise<(string | null)[]>, [keys: string[]]>;
  zAdd: jest.Mock<
    Promise<number>,
    [
      key: string,
      members:
        | { score: number; value: string }
        | { score: number; value: string }[],
    ]
  >;
  zRange: jest.Mock<
    Promise<string[]>,
    [key: string, start: number, stop: number]
  >;
  zRem: jest.Mock<Promise<number>, [key: string, member: string]>;
  exists: jest.Mock<Promise<number>, [keys: string | string[]]>;
  expire: jest.Mock<Promise<number>, [key: string, ttl: number]>;
  flushDb: jest.Mock<Promise<'OK'>, []>;
  on: jest.Mock<
    RedisClientMock,
    [event: string, listener: (...args: any[]) => void]
  >;
  subscribe: jest.Mock;
  unsubscribe: jest.Mock;
  pSubscribe: jest.Mock;
  pUnsubscribe: jest.Mock;
  scanIterator: jest.Mock<
    AsyncIterableIterator<string>,
    [options?: { MATCH?: string; COUNT?: number }]
  >;
  lLen: jest.Mock<Promise<number>, [key: string]>;
  lPush: jest.Mock<Promise<number>, [key: string, value: string | string[]]>;
  lRange: jest.Mock<
    Promise<string[]>,
    [key: string, start: number, stop: number]
  >;
  rPush: jest.Mock<Promise<number>, [key: string, value: string | string[]]>;
  isOpen?: boolean;
};

// Storage for mock data
const mockRedisData = new Map<string, string>();
const mockSortedSetData = new Map<string, Map<string, number>>();

jest.mock('redis', () => {
  let clientInstance: RedisClientMock | null = null;
  const createClient = jest.fn((arg?: any) => {
    if (arg === 'teardown') {
      clientInstance = null;
      mockRedisData.clear();
      mockSortedSetData.clear();
      return;
    }
    if (!clientInstance) {
      clientInstance = {
        ping: jest.fn(() => Promise.resolve('PONG')),
        connect: jest.fn(() => {
          clientInstance!.isOpen = true;
          return Promise.resolve(clientInstance!);
        }),
        quit: jest.fn(() => Promise.resolve('OK')),
        get: jest.fn((key: string) => {
          return Promise.resolve(mockRedisData.get(key) || null);
        }),
        exists: jest.fn((keys: string | string[]) => {
          const keysArray = Array.isArray(keys) ? keys : [keys];
          return Promise.resolve(keysArray.length);
        }),
        set: jest.fn((key: string, value: string, options?: any) => {
          mockRedisData.set(key, value);
          return Promise.resolve('OK');
        }),
        setEx: jest.fn((key: string, value: string, expire: number) => {
          mockRedisData.set(key, value);
          return Promise.resolve('OK');
        }),
        del: jest.fn((keys: string | string[]) => {
          const keysArray = Array.isArray(keys) ? keys : [keys];
          let deleted = 0;
          keysArray.forEach((key) => {
            if (mockRedisData.delete(key)) {
              deleted++;
            }
            if (mockSortedSetData.delete(key)) {
              deleted++;
            }
          });
          return Promise.resolve(deleted);
        }),
        mGet: jest.fn((keys: string[]) => {
          const values = keys.map((key) => mockRedisData.get(key) || null);
          return Promise.resolve(values);
        }),
        zAdd: jest.fn(
          (
            key: string,
            members:
              | { score: number; value: string }
              | { score: number; value: string }[],
          ) => {
            const entries = Array.isArray(members) ? members : [members];
            let set = mockSortedSetData.get(key);
            if (!set) {
              set = new Map();
              mockSortedSetData.set(key, set);
            }
            entries.forEach(({ score, value }) => {
              set!.set(value, score);
            });
            return Promise.resolve(entries.length);
          },
        ),
        zRange: jest.fn((key: string, start: number, stop: number) => {
          const set = mockSortedSetData.get(key);
          if (!set) {
            return Promise.resolve([]);
          }
          const sorted = [...set.entries()]
            .sort((a, b) => a[1] - b[1])
            .map(([value]) => value);
          const normalizedStop = stop === -1 ? sorted.length - 1 : stop;
          return Promise.resolve(sorted.slice(start, normalizedStop + 1));
        }),
        zRem: jest.fn((key: string, member: string) => {
          const set = mockSortedSetData.get(key);
          if (!set) {
            return Promise.resolve(0);
          }
          const existed = set.delete(member) ? 1 : 0;
          if (set.size === 0) {
            mockSortedSetData.delete(key);
          }
          return Promise.resolve(existed);
        }),
        expire: jest.fn((key: string, ttl: number) => Promise.resolve(1)),
        flushDb: jest.fn(() => {
          mockRedisData.clear();
          mockSortedSetData.clear();
          return Promise.resolve('OK');
        }),
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve()),
        unsubscribe: jest.fn(() => Promise.resolve()),
        pSubscribe: jest.fn(() => Promise.resolve()),
        pUnsubscribe: jest.fn(() => Promise.resolve()),
        scanIterator: jest.fn(async function* (options?: {
          MATCH?: string;
          COUNT?: number;
        }): AsyncIterableIterator<string> {
          const pattern = options?.MATCH || '*';
          const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
          );
          const allKeys = new Set([
            ...mockRedisData.keys(),
            ...mockSortedSetData.keys(),
          ]);
          for (const key of allKeys) {
            if (regex.test(key)) {
              yield key;
            }
          }
        }),
        lLen: jest.fn((key: string) => {
          const list = mockRedisData.get(key);
          if (!list) return Promise.resolve(0);
          const items = JSON.parse(list) as string[];
          return Promise.resolve(items.length);
        }),
        lPush: jest.fn((key: string, value: string | string[]) => {
          const list = mockRedisData.get(key);
          const items = list ? (JSON.parse(list) as string[]) : [];
          const valuesToAdd = Array.isArray(value) ? value : [value];
          const newItems = [...valuesToAdd, ...items];
          mockRedisData.set(key, JSON.stringify(newItems));
          return Promise.resolve(newItems.length);
        }),
        lRange: jest.fn((key: string, start: number, stop: number) => {
          const list = mockRedisData.get(key);
          if (!list) return Promise.resolve([]);
          const items = JSON.parse(list) as string[];
          const normalizedStop = stop === -1 ? items.length - 1 : stop;
          return Promise.resolve(items.slice(start, normalizedStop + 1));
        }),
        rPush: jest.fn((key: string, value: string | string[]) => {
          const list = mockRedisData.get(key);
          const items = list ? (JSON.parse(list) as string[]) : [];
          const valuesToAdd = Array.isArray(value) ? value : [value];
          const newItems = [...items, ...valuesToAdd];
          mockRedisData.set(key, JSON.stringify(newItems));
          return Promise.resolve(newItems.length);
        }),
      };
    }
    return clientInstance;
  });
  return {
    createClient,
  };
});

import { createClient } from 'redis';

afterEach(() => {
  (createClient as (arg: string) => void)('teardown');
});
