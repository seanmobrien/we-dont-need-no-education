export type LikeRedisClientType = {
  ping: () => Promise<string>;
  connect: <T extends LikeRedisClientType = LikeRedisClientType>() => Promise<T>;
  quit: () => Promise<string>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: any) => Promise<'OK'>;
  setEx: (key: string, value: string, expire: number) => Promise<'OK'>;
  del: (keys: string | string[]) => Promise<number>;
  mGet: (keys: string[]) => Promise<(string | null)[]>;
  zAdd: (
    key: string,
    members:
      | { score: number; value: string }
      | { score: number; value: string }[],
  ) => Promise<number>;
  zRange: (key: string, start: number, stop: number) => Promise<string[]>;
  zRem: (key: string, member: string) => Promise<number>;
  exists: (keys: string | string[]) => Promise<number>;
  expire: (key: string, ttl: number) => Promise<number>;
  flushDb: () => Promise<string>;
  on: <T extends LikeRedisClientType = LikeRedisClientType>(event: string, listener: (...args: any[]) => void) => T;
  subscribe: (...args: any[]) => Promise<unknown>;
  unsubscribe: (...args: any[]) => Promise<unknown>;
  pSubscribe: (...args: any[]) => Promise<unknown>;
  pUnsubscribe: (...args: any[]) => Promise<unknown>;
  scanIterator: (options?: {
    MATCH?: string;
    COUNT?: number;
  }) => AsyncIterableIterator<string>;
  lLen: (key: string) => Promise<number>;
  lPush: (key: string, value: string | string[]) => Promise<number>;
  lRange: (key: string, start: number, stop: number) => Promise<string[]>;
  rPush: (key: string, value: string | string[]) => Promise<number>;
};
