import { LoggedError } from '@compliance-theater/logger';
import { makeStreamResponse, nodeStreamToReadableStream } from '../response';
export class StreamingStrategy {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    detectStreamingResponse(headers) {
        const te = headers['transfer-encoding'];
        const ct = headers['content-type'] || '';
        if (te && te.toLowerCase().includes('chunked'))
            return true;
        if (ct.includes('text/event-stream') || ct.includes('multipart/'))
            return true;
        if (!('content-length' in headers) && te)
            return true;
        return false;
    }
    handlePureStreaming(cacheKey, stream, headers, statusCode, span, shouldReleaseSemaphore = true) {
        const config = this.deps.fetchConfig();
        if (config.stream_enabled) {
            this.deps.cacheStreamToRedis(cacheKey, stream, headers, statusCode, []);
        }
        if (shouldReleaseSemaphore) {
            const releaseOnce = () => {
                try {
                    this.deps.releaseSemaphore();
                }
                catch (semErr) {
                    LoggedError.isTurtlesAllTheWayDownBaby(semErr, {
                        source: 'streaming-strategy:semaphore:release',
                        log: true,
                    });
                }
            };
            const ee = stream;
            ee.on('end', releaseOnce);
            ee.on('error', releaseOnce);
        }
        span.setAttribute('http.status_code', statusCode);
        return makeStreamResponse(nodeStreamToReadableStream(stream), {
            status: statusCode,
            headers,
        });
    }
}
//# sourceMappingURL=streaming-strategy.js.map