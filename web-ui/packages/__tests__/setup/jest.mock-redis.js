const mockRedisData = new Map();
const mockSortedSetData = new Map();
jest.mock('redis', () => {
    let clientInstance = null;
    const createClient = jest.fn((arg) => {
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
                    clientInstance.isOpen = true;
                    return Promise.resolve(clientInstance);
                }),
                quit: jest.fn(() => Promise.resolve('OK')),
                get: jest.fn((key) => {
                    return Promise.resolve(mockRedisData.get(key) || null);
                }),
                exists: jest.fn((keys) => {
                    const keysArray = Array.isArray(keys) ? keys : [keys];
                    return Promise.resolve(keysArray.length);
                }),
                set: jest.fn((key, value, options) => {
                    mockRedisData.set(key, value);
                    return Promise.resolve('OK');
                }),
                setEx: jest.fn((key, value, expire) => {
                    mockRedisData.set(key, value);
                    return Promise.resolve('OK');
                }),
                del: jest.fn((keys) => {
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
                mGet: jest.fn((keys) => {
                    const values = keys.map((key) => mockRedisData.get(key) || null);
                    return Promise.resolve(values);
                }),
                zAdd: jest.fn((key, members) => {
                    const entries = Array.isArray(members) ? members : [members];
                    let set = mockSortedSetData.get(key);
                    if (!set) {
                        set = new Map();
                        mockSortedSetData.set(key, set);
                    }
                    entries.forEach(({ score, value }) => {
                        set.set(value, score);
                    });
                    return Promise.resolve(entries.length);
                }),
                zRange: jest.fn((key, start, stop) => {
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
                zRem: jest.fn((key, member) => {
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
                expire: jest.fn((key, ttl) => Promise.resolve(1)),
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
                scanIterator: jest.fn(async function* (options) {
                    const pattern = options?.MATCH || '*';
                    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
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
                lLen: jest.fn((key) => {
                    const list = mockRedisData.get(key);
                    if (!list)
                        return Promise.resolve(0);
                    const items = JSON.parse(list);
                    return Promise.resolve(items.length);
                }),
                lPush: jest.fn((key, value) => {
                    const list = mockRedisData.get(key);
                    const items = list ? JSON.parse(list) : [];
                    const valuesToAdd = Array.isArray(value) ? value : [value];
                    const newItems = [...valuesToAdd, ...items];
                    mockRedisData.set(key, JSON.stringify(newItems));
                    return Promise.resolve(newItems.length);
                }),
                lRange: jest.fn((key, start, stop) => {
                    const list = mockRedisData.get(key);
                    if (!list)
                        return Promise.resolve([]);
                    const items = JSON.parse(list);
                    const normalizedStop = stop === -1 ? items.length - 1 : stop;
                    return Promise.resolve(items.slice(start, normalizedStop + 1));
                }),
                rPush: jest.fn((key, value) => {
                    const list = mockRedisData.get(key);
                    const items = list ? JSON.parse(list) : [];
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
    createClient('teardown');
});
//# sourceMappingURL=jest.mock-redis.js.map