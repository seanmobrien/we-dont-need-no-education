import { LoggedError } from '@compliance-theater/logger';
import { makeResponse, makeStreamResponse, nodeStreamToReadableStream, } from '../response';
export class CacheStrategies {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async tryMemoryCache(cacheKey, span) {
        const cached = this.deps.cache.get(cacheKey);
        if (cached) {
            span.setAttribute('http.cache_hit', true);
            return cached.then((v) => makeResponse(v));
        }
        span.setAttribute('http.cache_hit', false);
        return undefined;
    }
    async tryRedisCache(cacheKey, span) {
        try {
            const redis = await this.deps.getRedisClient();
            const raw = await redis.get(cacheKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                const body = Buffer.from(parsed.bodyB64, 'base64');
                const value = {
                    body,
                    headers: parsed.headers,
                    statusCode: parsed.statusCode,
                };
                this.deps.cache.set(cacheKey, Promise.resolve(value));
                span.setAttribute('http.redis_hit', true);
                span.setAttribute('http.status_code', parsed.statusCode);
                return makeResponse(value);
            }
            const streamKey = `${cacheKey}:stream`;
            const metaKey = `${cacheKey}:stream:meta`;
            const streamLen = await redis.lLen(streamKey).catch((err) => {
                LoggedError.isTurtlesAllTheWayDownBaby(err, {
                    source: 'cache-strategies:redis:lLen',
                    log: true,
                });
                return 0;
            });
            if (streamLen > 0) {
                const metaRaw = await redis.get(metaKey).catch((err) => {
                    LoggedError.isTurtlesAllTheWayDownBaby(err, {
                        source: 'cache-strategies:redis:get-stream-meta',
                        log: true,
                    });
                    return null;
                });
                let meta = undefined;
                if (metaRaw) {
                    try {
                        const parsed = JSON.parse(metaRaw);
                        if (parsed && typeof parsed === 'object') {
                            const p = parsed;
                            const headers = p.headers;
                            const statusCode = p.statusCode;
                            meta = {
                                headers: typeof headers === 'object' && headers
                                    ? headers
                                    : undefined,
                                statusCode: typeof statusCode === 'number'
                                    ? statusCode
                                    : undefined,
                            };
                        }
                    }
                    catch (parseErr) {
                        LoggedError.isTurtlesAllTheWayDownBaby(parseErr, {
                            source: 'cache-strategies:redis:parse-stream-meta',
                            log: true,
                        });
                    }
                }
                const { PassThrough } = await import('stream');
                const pass = new PassThrough();
                (async () => {
                    try {
                        const items = await redis.lRange(streamKey, 0, -1);
                        for (const it of items.reverse()) {
                            try {
                                pass.write(Buffer.from(it, 'base64'));
                            }
                            catch (writeErr) {
                                LoggedError.isTurtlesAllTheWayDownBaby(writeErr, {
                                    source: 'cache-strategies:redis:stream-replay-write',
                                    log: true,
                                });
                            }
                        }
                    }
                    catch (rangeErr) {
                        LoggedError.isTurtlesAllTheWayDownBaby(rangeErr, {
                            source: 'cache-strategies:redis:stream-replay-range',
                            log: true,
                        });
                    }
                    finally {
                        pass.end();
                    }
                })();
                span.setAttribute('http.redis_stream_replay', true);
                span.setAttribute('http.status_code', meta?.statusCode ?? 200);
                return makeStreamResponse(nodeStreamToReadableStream(pass), {
                    status: meta?.statusCode ?? 200,
                    headers: meta?.headers ?? {},
                });
            }
            return undefined;
        }
        catch (redisErr) {
            span.setAttribute('http.redis_unavailable', true);
            LoggedError.isTurtlesAllTheWayDownBaby(redisErr, {
                source: 'cache-strategies:redis:cache-check',
                log: true,
            });
            return undefined;
        }
    }
    async tryInflightDedupe(cacheKey, span) {
        const inFlight = this.deps.inflightMap.get(cacheKey);
        if (inFlight) {
            span.setAttribute('http.inflight_dedupe', true);
            return inFlight.then((v) => makeResponse(v));
        }
        return undefined;
    }
    async cacheBufferedToRedis(cacheKey, value) {
        try {
            const redis = await this.deps.getRedisClient();
            const config = this.deps.fetchConfig();
            const payload = JSON.stringify({
                bodyB64: value.body.toString('base64'),
                headers: value.headers,
                statusCode: value.statusCode,
            });
            await redis.setEx(cacheKey, config.fetch_cache_ttl, payload);
        }
        catch (err) {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                source: 'cache-strategies:redis:buffer-cache',
                log: true,
            });
        }
    }
    async cacheStreamToRedis(cacheKey, stream, headers, statusCode, alreadyConsumedChunks = []) {
        try {
            const redis = await this.deps.getRedisClient();
            const config = this.deps.fetchConfig();
            const streamKey = `${cacheKey}:stream`;
            const metaKey = `${cacheKey}:stream:meta`;
            const maxChunks = config.fetch_stream_max_chunks;
            const maxBytes = config.fetch_stream_max_total_bytes;
            let totalBytes = 0;
            let pushed = 0;
            await redis.del(streamKey).catch((err) => {
                LoggedError.isTurtlesAllTheWayDownBaby(err, {
                    source: 'cache-strategies:redis:stream-cache-del',
                    log: true,
                });
            });
            await redis
                .set(metaKey, JSON.stringify({
                headers,
                statusCode,
            }))
                .catch((err) => {
                LoggedError.isTurtlesAllTheWayDownBaby(err, {
                    source: 'cache-strategies:redis:stream-cache-set-meta',
                    log: true,
                });
            });
            for (const chunk of alreadyConsumedChunks) {
                const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                totalBytes += b.length;
                if (totalBytes > maxBytes || pushed >= maxChunks)
                    break;
                await redis.rPush(streamKey, b.toString('base64'));
                pushed++;
            }
            for await (const chunk of stream) {
                if (totalBytes > maxBytes || pushed >= maxChunks)
                    break;
                const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                totalBytes += b.length;
                if (totalBytes > maxBytes)
                    break;
                try {
                    await redis.rPush(streamKey, b.toString('base64'));
                    pushed++;
                }
                catch (pushErr) {
                    LoggedError.isTurtlesAllTheWayDownBaby(pushErr, {
                        source: 'cache-strategies:redis:stream-cache-push',
                        log: true,
                    });
                    break;
                }
            }
            await redis
                .expire(streamKey, config.fetch_cache_ttl)
                .catch((err) => {
                LoggedError.isTurtlesAllTheWayDownBaby(err, {
                    source: 'cache-strategies:redis:stream-cache-expire-stream',
                    log: true,
                });
            });
            await redis
                .expire(metaKey, config.fetch_cache_ttl)
                .catch((err) => {
                LoggedError.isTurtlesAllTheWayDownBaby(err, {
                    source: 'cache-strategies:redis:stream-cache-expire-meta',
                    log: true,
                });
            });
        }
        catch (streamCacheErr) {
            LoggedError.isTurtlesAllTheWayDownBaby(streamCacheErr, {
                source: 'cache-strategies:redis:stream-cache-background',
                log: true,
            });
        }
    }
}
//# sourceMappingURL=cache-strategies.js.map