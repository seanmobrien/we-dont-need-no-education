// Mock Redis client for cache tests

type RedisClientMock = {
  connect: jest.Mock<Promise<RedisClientMock>, []>;
  quit: jest.Mock<Promise<string>, []>;
  get: jest.Mock<Promise<string | null>, [key: string]>;
  set: jest.Mock<Promise<'OK'>, [key: string, value: string]>;
  setEx: jest.Mock<Promise<'OK'>, [key: string, value: string, expire: number]>;
  del: jest.Mock<Promise<number>, [key: string]>;
  flushDb: jest.Mock<Promise<'OK'>, []>;
  on: jest.Mock<
    RedisClientMock,
    [event: string, listener: (...args: any[]) => void]
  >;
  subscribe: jest.Mock;
  unsubscribe: jest.Mock;
  pSubscribe: jest.Mock;
  pUnsubscribe: jest.Mock;
};

jest.mock('redis', () => {
  let clientInstance: RedisClientMock | null = null;

  const createClient = jest.fn((arg?: any) => {
    if (arg === 'teardown') {
      clientInstance = null;
      return;
    }
    if (!clientInstance) {
      clientInstance = {
        connect: jest.fn(() => Promise.resolve(clientInstance!)),
        quit: jest.fn(() => Promise.resolve('OK')),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        flushDb: jest.fn().mockResolvedValue('OK'),
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve()),
        unsubscribe: jest.fn(() => Promise.resolve()),
        pSubscribe: jest.fn(() => Promise.resolve()),
        pUnsubscribe: jest.fn(() => Promise.resolve()),
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
