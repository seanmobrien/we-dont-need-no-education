import { LoggedError, log } from '@compliance-theater/logger';
import { makeResponse, makeStreamResponse, nodeStreamToReadableStream, } from './../response';
export class BufferingStrategy {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async handleBufferedResponse(cacheKey, stream, headers, statusCode, url, span, shouldReleaseSemaphore = true) {
        const chunks = [];
        let bufferedBytes = 0;
        let ended = false;
        let errored = undefined;
        let sizeExceeded = false;
        const onData = (chunk) => {
            const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
            if (bufferedBytes + b.length > this.deps.config.maxResponseSize) {
                if (!sizeExceeded) {
                    sizeExceeded = true;
                    log((l) => l.warn(`[buffering-strategy] Response size exceeded limit (${this.deps.config.maxResponseSize} bytes), switching to streaming: ${url}`));
                }
                return;
            }
            chunks.push(b);
            bufferedBytes += b.length;
        };
        const onEnd = () => {
            ended = true;
            cleanupEvents();
        };
        const onError = (err) => {
            errored = err;
            cleanupEvents();
        };
        const cleanupEvents = () => {
            const ee = stream;
            ee.removeListener('data', onData);
            ee.removeListener('end', onEnd);
            ee.removeListener('error', onError);
        };
        const ee2 = stream;
        ee2.on('data', onData);
        ee2.on('end', onEnd);
        ee2.on('error', onError);
        await new Promise((resolve) => {
            const check = () => {
                if (ended || errored)
                    return resolve();
                if (bufferedBytes >= this.deps.config.streamDetectBuffer)
                    return resolve();
                if (sizeExceeded)
                    return resolve();
            };
            check();
            const i = setInterval(() => {
                if (ended ||
                    errored ||
                    sizeExceeded ||
                    bufferedBytes >= this.deps.config.streamDetectBuffer) {
                    clearInterval(i);
                    resolve();
                }
            }, 10);
        });
        if (errored)
            throw errored;
        if (ended && !sizeExceeded) {
            const body = Buffer.concat(chunks);
            const value = {
                body,
                headers,
                statusCode,
            };
            this.deps.cache.set(cacheKey, Promise.resolve(value));
            this.cacheBufferedToRedis(cacheKey, value);
            if (shouldReleaseSemaphore)
                this.releaseSemaphore('buffered');
            span.setAttribute('http.status_code', statusCode);
            return {
                response: makeResponse(value),
                mode: 'buffered',
            };
        }
        if (bufferedBytes > this.deps.config.streamBufferMax || sizeExceeded) {
            span.setAttribute('http.size_limit_exceeded', sizeExceeded);
            span.setAttribute('http.buffered_bytes', bufferedBytes);
            const { PassThrough } = await import('stream');
            const pass = new PassThrough();
            for (const c of chunks)
                pass.write(c);
            stream.pipe(pass);
            const config = this.deps.fetchConfig();
            if (config.stream_enabled) {
                this.deps.cacheStreamToRedis(cacheKey, stream, headers, statusCode, chunks);
            }
            if (shouldReleaseSemaphore) {
                const releaseOnce = () => {
                    this.releaseSemaphore('large-buffer');
                };
                const ee3 = pass;
                ee3.on('end', releaseOnce);
                ee3.on('error', releaseOnce);
            }
            span.setAttribute('http.status_code', statusCode);
            return {
                response: makeStreamResponse(nodeStreamToReadableStream(pass), {
                    status: statusCode,
                    headers,
                }),
                mode: 'streaming',
            };
        }
        await new Promise((resolve, reject) => {
            if (ended)
                return resolve();
            if (errored)
                return reject(errored);
            const onEnd2 = () => {
                cleanupEvents2();
                resolve();
            };
            const onErr2 = (e) => {
                cleanupEvents2();
                reject(e);
            };
            const cleanupEvents2 = () => {
                const ee3 = stream;
                ee3.removeListener('end', onEnd2);
                ee3.removeListener('error', onErr2);
            };
            const ee3 = stream;
            ee3.once('end', onEnd2);
            ee3.once('error', onErr2);
        });
        if (errored)
            throw errored;
        const body = Buffer.concat(chunks);
        const value = {
            body,
            headers,
            statusCode,
        };
        this.deps.cache.set(cacheKey, Promise.resolve(value));
        this.cacheBufferedToRedis(cacheKey, value);
        if (shouldReleaseSemaphore)
            this.releaseSemaphore('final');
        span.setAttribute('http.status_code', statusCode);
        return {
            response: makeResponse(value),
            mode: 'buffered',
        };
    }
    releaseSemaphore(context) {
        try {
            this.deps.releaseSemaphore();
        }
        catch (semErr) {
            LoggedError.isTurtlesAllTheWayDownBaby(semErr, {
                source: `buffering-strategy:semaphore:release-${context}`,
                log: true,
            });
        }
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
        catch (redisCacheErr) {
            LoggedError.isTurtlesAllTheWayDownBaby(redisCacheErr, {
                source: 'buffering-strategy:redis:buffer-cache',
                log: true,
            });
        }
    }
}
//# sourceMappingURL=buffering-strategy.js.map