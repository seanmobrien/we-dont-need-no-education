/* global Response, Buffer, setInterval, clearInterval */

import type { EventEmitter } from 'events';
import type { Readable } from 'stream';
import { makeResponse, makeStreamResponse, nodeStreamToReadableStream } from '../response';
import type { CachedValue } from './fetch-types';

type Handler = (...args: unknown[]) => void;

export class BufferingStrategy {
    constructor(
        private readonly cache: Map<string, Promise<CachedValue>>,
        private readonly streamDetectBuffer: number,
        private readonly streamBufferMax: number,
        private readonly maxResponseSize: number,
    ) { }

    async handleBufferedResponse(
        cacheKey: string,
        stream: Readable,
        headers: Record<string, string>,
        statusCode: number,
        releaseSemaphore?: () => void,
    ): Promise<Response> {
        const chunks: Buffer[] = [];
        let bufferedBytes = 0;
        let ended = false;
        let errored: Error | undefined;
        let sizeExceeded = false;

        const onData = (chunk: Buffer) => {
            const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
            if (bufferedBytes + b.length > this.maxResponseSize) {
                sizeExceeded = true;
                return;
            }
            chunks.push(b);
            bufferedBytes += b.length;
        };

        const onEnd = () => {
            ended = true;
            cleanup();
        };

        const onError = (err: Error) => {
            errored = err;
            cleanup();
        };

        const cleanup = () => {
            const ee = stream as unknown as EventEmitter;
            ee.removeListener('data', onData as Handler);
            ee.removeListener('end', onEnd as Handler);
            ee.removeListener('error', onError as Handler);
        };

        const ee = stream as unknown as EventEmitter;
        ee.on('data', onData as Handler);
        ee.on('end', onEnd as Handler);
        ee.on('error', onError as Handler);

        await new Promise<void>((resolve) => {
            const i = setInterval(() => {
                if (
                    ended ||
                    errored ||
                    sizeExceeded ||
                    bufferedBytes >= this.streamDetectBuffer
                ) {
                    clearInterval(i);
                    resolve();
                }
            }, 10);
        });

        if (errored) {
            throw errored;
        }

        if (ended && !sizeExceeded) {
            const value: CachedValue = {
                body: Buffer.concat(chunks),
                headers,
                statusCode,
            };
            this.cache.set(cacheKey, Promise.resolve(value));
            if (releaseSemaphore) {
                releaseSemaphore();
            }
            return makeResponse(value);
        }

        if (bufferedBytes > this.streamBufferMax || sizeExceeded) {
            const { PassThrough } = await import('stream');
            const pass = new PassThrough();
            for (const c of chunks) {
                pass.write(c);
            }
            stream.pipe(pass);

            if (releaseSemaphore) {
                const releaseOnce = () => {
                    try {
                        releaseSemaphore();
                    } catch {
                        // no-op
                    }
                };
                pass.on('end', releaseOnce);
                pass.on('error', releaseOnce);
            }

            return makeStreamResponse(nodeStreamToReadableStream(pass), {
                status: statusCode,
                headers,
            });
        }

        await new Promise<void>((resolve, reject) => {
            if (ended) return resolve();
            if (errored) return reject(errored);

            const onEnd2 = () => {
                cleanup2();
                resolve();
            };
            const onErr2 = (e: Error) => {
                cleanup2();
                reject(e);
            };
            const cleanup2 = () => {
                const ee2 = stream as unknown as EventEmitter;
                ee2.removeListener('end', onEnd2 as Handler);
                ee2.removeListener('error', onErr2 as Handler);
            };

            const ee2 = stream as unknown as EventEmitter;
            ee2.once('end', onEnd2 as Handler);
            ee2.once('error', onErr2 as Handler);
        });

        if (errored) {
            throw errored;
        }

        const value: CachedValue = {
            body: Buffer.concat(chunks),
            headers,
            statusCode,
        };
        this.cache.set(cacheKey, Promise.resolve(value));
        if (releaseSemaphore) {
            releaseSemaphore();
        }
        return makeResponse(value);
    }
}
