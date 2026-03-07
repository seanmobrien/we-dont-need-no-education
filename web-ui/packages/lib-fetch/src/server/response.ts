/* global Response, ReadableStream, NodeJS, Buffer, TextEncoder */

import type { Readable } from 'stream';
import type { CachedValue } from './fetch/fetch-types';

export const makeResponse = (value: CachedValue): Response => {
    return new Response(new Uint8Array(value.body), {
        status: value.statusCode,
        headers: value.headers,
    });
};

export const makeStreamResponse = (
    stream: ReadableStream<Uint8Array>,
    init: { status: number; headers: Record<string, string> },
): Response => {
    return new Response(stream, {
        status: init.status,
        headers: init.headers,
    });
};

export const nodeStreamToReadableStream = (
    nodeStream: NodeJS.ReadableStream,
): ReadableStream<Uint8Array> => {
    return new ReadableStream<Uint8Array>({
        start(controller) {
            nodeStream.on('data', (chunk: Buffer | string) => {
                controller.enqueue(
                    typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk),
                );
            });
            nodeStream.on('end', () => controller.close());
            nodeStream.on('error', (error) => controller.error(error));
        },
        cancel() {
            const closeFn = (nodeStream as { destroy?: () => void }).destroy;
            if (typeof closeFn === 'function') {
                closeFn.call(nodeStream);
            }
        },
    });
};

export const webStreamToReadable = async (
    stream: ReadableStream<Uint8Array>,
): Promise<Readable> => {
    const mod = await import('stream');
    return mod.Readable.fromWeb(stream as unknown as any);
};
