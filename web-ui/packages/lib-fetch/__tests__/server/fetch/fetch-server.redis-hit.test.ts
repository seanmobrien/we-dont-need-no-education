/* @jest-environment node */

jest.mock('got', () => ({
    __esModule: true,
    default: Object.assign(jest.fn(), {
        stream: jest.fn(),
    }),
}));

jest.mock('@compliance-theater/redis', () => ({
    getRedisClient: jest.fn(),
}));

import { getRedisClient } from '@compliance-theater/redis';
import { FetchManager } from '../../../src/server/fetch/fetch-server';

const mockGot = jest.requireMock('got').default as jest.Mock & {
    stream: jest.Mock;
};

describe('FetchManager Redis integration', () => {
    beforeEach(() => {
        mockGot.mockClear();
        mockGot.stream.mockClear();
        (getRedisClient as jest.Mock).mockReset();
    });

    it('returns Redis-cached GET response and does not call network fetch', async () => {
        const cacheKey = 'GET:https://example.com/redis-hit';
        const redisPayload = {
            bodyB64: Buffer.from('cached body').toString('base64'),
            headers: { 'content-type': 'text/plain' },
            statusCode: 200,
        };

        const mockRedisClient = {
            get: jest.fn().mockImplementation(async (key: string) => {
                if (key === cacheKey) {
                    return JSON.stringify(redisPayload);
                }
                return null;
            }),
            lLen: jest.fn().mockResolvedValue(0),
        };

        (getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);

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

        const mockRedisClient = {
            get: jest.fn().mockImplementation(async (key: string) => {
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
            }),
            lLen: jest.fn().mockImplementation(async (key: string) => {
                if (key === streamKey) {
                    return 2;
                }
                return 0;
            }),
            lRange: jest.fn().mockResolvedValue([chunk1, chunk2]),
        };

        (getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);

        const manager = new FetchManager();
        const response = await manager.fetch('https://example.com/stream-hit');

        expect(response.status).toBe(206);
        expect(await response.text()).toBe('chunk2chunk1');
        expect(mockRedisClient.lRange).toHaveBeenCalledWith(streamKey, 0, -1);
        expect(mockGot).not.toHaveBeenCalled();
        expect(mockGot.stream).not.toHaveBeenCalled();
    });
});
