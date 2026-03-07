/* @jest-environment node */

jest.mock('@compliance-theater/redis', () => ({
    getRedisClient: jest.fn(),
}));

import { getRedisClient } from '@compliance-theater/redis';
import type { RedisClientType } from '@compliance-theater/types/redis/redis-client';
import { FetchManager } from '../../../src/server/fetch/fetch-server';
import { got } from 'got';

describe('FetchManager Redis integration', () => {
    let mockGot: jest.Mock;

    const makeMockRedisClient = (): jest.Mocked<RedisClientType> => {
        return {
            get: jest.fn().mockResolvedValue(null),
            lLen: jest.fn().mockResolvedValue(0),
            lRange: jest.fn().mockResolvedValue([]),
            setEx: jest.fn().mockResolvedValue('OK'),
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
            rPush: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
        } as unknown as jest.Mocked<RedisClientType>;
    };

    beforeEach(() => {
        mockGot = got as unknown as jest.Mock;
        mockGot.mockClear();
        (mockGot.stream as jest.Mock | undefined)?.mockClear?.();
        (getRedisClient as jest.Mock).mockClear();
    });

    it('returns Redis-cached GET response and does not call network fetch', async () => {
        const cacheKey = 'GET:https://example.com/redis-hit';
        const redisPayload = {
            bodyB64: Buffer.from('cached body').toString('base64'),
            headers: { 'content-type': 'text/plain' },
            statusCode: 200,
        };
        const mockRedisClient = makeMockRedisClient();
        (getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);
        const prevGetImpl = mockRedisClient.get.getMockImplementation();
        mockRedisClient.get.mockImplementation(async (key: string) => {
            if (key === cacheKey) {
                return JSON.stringify(redisPayload);
            }
            return prevGetImpl ? await prevGetImpl(key) : null;
        });
        mockRedisClient.lLen.mockResolvedValue(0);

        const manager = new FetchManager();

        const first = await manager.fetch('https://example.com/redis-hit');
        expect(await first.text()).toBe('cached body');

        const second = await manager.fetch('https://example.com/redis-hit');
        expect(await second.text()).toBe('cached body');

        expect(mockGot).not.toHaveBeenCalled();
        expect(mockGot.stream).not.toHaveBeenCalled();
        expect(getRedisClient).toHaveBeenCalledTimes(1);
    });

    it('replays Redis stream cache and does not call network fetch', async () => {
        const cacheKey = 'GET:https://example.com/stream-hit';
        const streamKey = `${cacheKey}:stream`;
        const metaKey = `${cacheKey}:stream:meta`;

        const chunk1 = Buffer.from('chunk1').toString('base64');
        const chunk2 = Buffer.from('chunk2').toString('base64');

        const mockRedisClient = makeMockRedisClient();
        mockRedisClient.get.mockImplementation(async (key: string) => {
            if (key === cacheKey) {
                return null;
            }
            if (key === metaKey) {
                return JSON.stringify({
                    statusCode: 206,
                    headers: { 'content-type': 'text/event-stream' },
                });
            }
            return null;
        });
        mockRedisClient.lLen.mockImplementation(async (key: string) => {
            if (key === streamKey) {
                return 2;
            }
            return 0;
        });
        mockRedisClient.lRange.mockResolvedValue([chunk1, chunk2]);

        (getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);

        const manager = new FetchManager();
        const response: Response = await manager.fetch('https://example.com/stream-hit') as unknown as Response;

        expect(response.status).toBe(206);
        expect(await response.text()).toBe('chunk2chunk1');
        expect(mockRedisClient.lRange).toHaveBeenCalledWith(streamKey, 0, -1);
        expect(mockGot).not.toHaveBeenCalled();
        expect(mockGot.stream).not.toHaveBeenCalled();
    });
});
