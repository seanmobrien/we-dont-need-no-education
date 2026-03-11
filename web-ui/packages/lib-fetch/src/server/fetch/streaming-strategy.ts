import { makeStreamResponse, nodeStreamToReadableStream } from '../response';
import type { Readable } from 'stream';

export class StreamingStrategy {
    detectStreamingResponse(headers: Record<string, string>): boolean {
        const te = headers['transfer-encoding'];
        const ct = headers['content-type'] || '';

        if (te && te.toLowerCase().includes('chunked')) return true;
        if (ct.includes('text/event-stream') || ct.includes('multipart/')) return true;
        if (!('content-length' in headers) && te) return true;

        return false;
    }

    handlePureStreaming(
        stream: Readable,
        headers: Record<string, string>,
        statusCode: number,
        releaseSemaphore?: () => void,
    ): Response {
        if (releaseSemaphore) {
            const releaseOnce = () => {
                try {
                    releaseSemaphore();
                } catch {
                    // no-op
                }
            };
            stream.on('end', releaseOnce);
            stream.on('error', releaseOnce);
        }

        return makeStreamResponse(nodeStreamToReadableStream(stream), {
            status: statusCode,
            headers,
        });
    }
}
