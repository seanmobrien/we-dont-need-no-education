/* global Response, Buffer */

import { makeResponse, makeStreamResponse, nodeStreamToReadableStream } from '../response';
import type { CacheStrategyDeps, CachedValue } from './fetch-types';

export class CacheStrategies {
    private readonly cache: Map<string, Promise<CachedValue>>;
    private readonly inflightMap: Map<string, Promise<CachedValue>>;

    constructor(
        cacheOrDeps: Map<string, Promise<CachedValue>> | CacheStrategyDeps,
        inflightMap?: Map<string, Promise<CachedValue>>,
    ) {
        if (cacheOrDeps instanceof Map) {
            this.cache = cacheOrDeps;
            this.inflightMap = inflightMap ?? new Map<string, Promise<CachedValue>>();
            return;
        }

        this.cache = cacheOrDeps.cache;
        this.inflightMap = cacheOrDeps.inflightMap;
        this.getRedisClient = cacheOrDeps.getRedisClient;
        this.fetchConfig = cacheOrDeps.fetchConfig;
    }

    private getRedisClient?: CacheStrategyDeps['getRedisClient'];
    private fetchConfig?: CacheStrategyDeps['fetchConfig'];

    async tryMemoryCache(cacheKey: string): Promise<Response | undefined> {
        const cached = this.cache.get(cacheKey);
        if (!cached) {
            return undefined;
        }
        return cached.then((v) => makeResponse(v));
    }

    async tryRedisCache(cacheKey: string): Promise<Response | undefined> {
        if (!this.getRedisClient) {
            return undefined;
        }

        try {
            const redis = await this.getRedisClient();

            const raw = await redis.get(cacheKey);
            if (raw) {
                const parsed = JSON.parse(raw) as {
                    bodyB64: string;
                    headers: Record<string, string>;
                    statusCode: number;
                };
                const value: CachedValue = {
                    body: Buffer.from(parsed.bodyB64, 'base64'),
                    headers: parsed.headers,
                    statusCode: parsed.statusCode,
                };
                this.cache.set(cacheKey, Promise.resolve(value));
                return makeResponse(value);
            }

            const streamKey = `${cacheKey}:stream`;
            const metaKey = `${cacheKey}:stream:meta`;
            const streamLen = await redis.lLen(streamKey).catch(() => 0);
            if (streamLen > 0) {
                const metaRaw = await redis.get(metaKey).catch(() => null);
                let statusCode = 200;
                let headers: Record<string, string> = {};

                if (metaRaw) {
                    try {
                        const parsed = JSON.parse(metaRaw) as {
                            statusCode?: number;
                            headers?: Record<string, string>;
                        };
                        statusCode = parsed.statusCode ?? 200;
                        headers = parsed.headers ?? {};
                    } catch {
                        // no-op
                    }
                }

                const { PassThrough } = await import('stream');
                const pass = new PassThrough();
                void (async () => {
                    try {
                        const items = await redis.lRange(streamKey, 0, -1);
                        for (const item of items.reverse()) {
                            pass.write(Buffer.from(item, 'base64'));
                        }
                    } finally {
                        pass.end();
                    }
                })();

                return makeStreamResponse(nodeStreamToReadableStream(pass), {
                    status: statusCode,
                    headers,
                });
            }

            return undefined;
        } catch {
            return undefined;
        }
    }

    async tryInflightDedupe(cacheKey: string): Promise<Response | undefined> {
        const inFlight = this.inflightMap.get(cacheKey);
        if (!inFlight) {
            return undefined;
        }
        return inFlight.then((v) => makeResponse(v));
    }

    async cacheBufferedToRedis(
        cacheKey: string,
        value: CachedValue,
    ): Promise<void> {
        if (!this.getRedisClient || !this.fetchConfig) {
            return;
        }

        try {
            const redis = await this.getRedisClient();
            const cfg = this.fetchConfig();
            const payload = JSON.stringify({
                bodyB64: value.body.toString('base64'),
                headers: value.headers,
                statusCode: value.statusCode,
            });
            await redis.setEx(cacheKey, cfg.fetch_cache_ttl, payload);
        } catch {
            // no-op
        }
    }

    async cacheStreamToRedis(
        cacheKey: string,
        stream: AsyncIterable<Buffer>,
        headers: Record<string, string>,
        statusCode: number,
        alreadyConsumedChunks: Buffer[] = [],
    ): Promise<void> {
        if (!this.getRedisClient || !this.fetchConfig) {
            return;
        }

        try {
            const redis = await this.getRedisClient();
            const cfg = this.fetchConfig();
            const streamKey = `${cacheKey}:stream`;
            const metaKey = `${cacheKey}:stream:meta`;

            const maxChunks = cfg.fetch_stream_max_chunks;
            const maxBytes = cfg.fetch_stream_max_total_bytes;

            let totalBytes = 0;
            let pushed = 0;

            await redis.del(streamKey).catch(() => undefined);
            await redis
                .set(metaKey, JSON.stringify({ headers, statusCode }))
                .catch(() => undefined);

            for (const chunk of alreadyConsumedChunks) {
                const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                totalBytes += b.length;
                if (totalBytes > maxBytes || pushed >= maxChunks) {
                    break;
                }
                await redis.rPush(streamKey, b.toString('base64'));
                pushed++;
            }

            for await (const chunk of stream) {
                if (totalBytes > maxBytes || pushed >= maxChunks) {
                    break;
                }

                const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                totalBytes += b.length;
                if (totalBytes > maxBytes) {
                    break;
                }

                try {
                    await redis.rPush(streamKey, b.toString('base64'));
                    pushed++;
                } catch {
                    break;
                }
            }

            await redis.expire(streamKey, cfg.fetch_cache_ttl).catch(() => undefined);
            await redis.expire(metaKey, cfg.fetch_cache_ttl).catch(() => undefined);
        } catch {
            // no-op
        }
    }
}
