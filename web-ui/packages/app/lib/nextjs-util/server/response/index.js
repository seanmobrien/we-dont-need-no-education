import { log, safeSerialize, LoggedError } from '@compliance-theater/logger';
import { isAbortError } from '@/lib/react-util';
import { isRunningOnServer } from '@compliance-theater/env';
const toUint8 = (chunk) => typeof chunk === 'string'
    ? new TextEncoder().encode(chunk)
    : new Uint8Array(chunk);
export class FetchResponse extends Response {
    _buffer;
    streamBody = null;
    _status;
    _bodyUsed = false;
    constructor(body, init = {}) {
        const headers = new Headers(init.headers);
        const requestedStatus = init.status ?? 200;
        const safeStatus = requestedStatus >= 200 && requestedStatus <= 599 ? requestedStatus : 200;
        super(null, { status: safeStatus, headers });
        this._status = requestedStatus;
        if (body instanceof ReadableStream) {
            this.streamBody = body;
            this._buffer = Buffer.alloc(0);
        }
        else {
            this._buffer = body || Buffer.alloc(0);
        }
    }
    get status() {
        return this._status;
    }
    get bodyUsed() {
        return this._bodyUsed;
    }
    get body() {
        if (this.streamBody) {
            return this.streamBody;
        }
        if (this._buffer && this._buffer.length > 0) {
            return new ReadableStream({
                start: (controller) => {
                    controller.enqueue(new Uint8Array(this._buffer));
                    controller.close();
                },
            });
        }
        return null;
    }
    get ok() {
        return this.status >= 200 && this.status < 300;
    }
    async consumeStream(maxSize = 10 * 1024 * 1024) {
        if (this._bodyUsed) {
            throw new TypeError('Body is unusable');
        }
        this._bodyUsed = true;
        if (!this.streamBody) {
            return new Uint8Array(0);
        }
        const reader = this.streamBody.getReader();
        const chunks = [];
        let totalLength = 0;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                if (value) {
                    totalLength += value.length;
                    if (totalLength > maxSize) {
                        throw new Error(`Body exceeded ${maxSize} limit`);
                    }
                    chunks.push(value);
                }
            }
        }
        finally {
            reader.releaseLock();
        }
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
    }
    async text() {
        if (this.streamBody) {
            const result = await this.consumeStream();
            return new TextDecoder().decode(result);
        }
        return this._buffer.toString('utf8');
    }
    async json() {
        return JSON.parse(await this.text());
    }
    async arrayBuffer() {
        if (this.streamBody) {
            const result = await this.consumeStream();
            return result.buffer;
        }
        const buf = this._buffer;
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    async blob() {
        const buffer = await this.arrayBuffer();
        return new Blob([buffer], {
            type: this.headers.get('Content-Type') || undefined,
        });
    }
    clone() {
        if (this.streamBody) {
            if (this._bodyUsed) {
                throw new TypeError('Cannot clone: body is already used');
            }
            const [stream1, stream2] = this.streamBody.tee();
            this.streamBody = stream1;
            return new FetchResponse(stream2, {
                status: this.status,
                headers: Object.fromEntries(this.headers.entries()),
            });
        }
        return new FetchResponse(Buffer.from(this._buffer), {
            status: this.status,
            headers: Object.fromEntries(this.headers.entries()),
        });
    }
    stream() {
        if (this.streamBody) {
            if (this._bodyUsed) {
                throw new TypeError('Body is unusable');
            }
            this._bodyUsed = true;
            return this.streamBody;
        }
        return new ReadableStream({
            start: (controller) => {
                controller.enqueue(new Uint8Array(this._buffer));
                controller.close();
            },
        });
    }
}
export default FetchResponse;
export const nodeStreamToReadableStream = (nodeStream) => {
    if (!nodeStream) {
        throw new TypeError('nodeStream is required');
    }
    let closed = false;
    let onData;
    let onEnd;
    let onError;
    const remove = (event, handler) => {
        if (!handler)
            return;
        if (typeof nodeStream.off === 'function') {
            nodeStream.off(event, handler);
        }
        else {
            nodeStream.removeListener(event, handler);
        }
    };
    const cleanup = () => {
        remove('data', onData);
        remove('end', onEnd);
        remove('error', onError);
        closed = true;
    };
    return new ReadableStream({
        start(controller) {
            onData = (chunk) => {
                if (closed)
                    return;
                controller.enqueue(toUint8(chunk));
            };
            onEnd = () => {
                if (closed)
                    return;
                cleanup();
                controller.close();
            };
            onError = (error) => {
                if (closed)
                    return;
                cleanup();
                controller.error(error);
            };
            nodeStream.on('data', onData);
            nodeStream.once('end', onEnd);
            nodeStream.once('error', onError);
        },
        cancel(reason) {
            if (closed)
                return;
            cleanup();
            const destroy = nodeStream
                .destroy;
            if (typeof destroy === 'function') {
                destroy.call(nodeStream, reason instanceof Error ? reason : undefined);
                return;
            }
            const returnFn = nodeStream.return;
            if (typeof returnFn === 'function') {
                returnFn.call(nodeStream);
                return;
            }
            const closeFn = nodeStream.close;
            if (typeof closeFn === 'function') {
                closeFn.call(nodeStream);
            }
        },
    });
};
const convertWebStreamOnNode = async (webStream) => {
    let streamModule = await import('stream').then((mod) => mod.default);
    if (!streamModule?.Readable) {
        try {
            streamModule = await import('node:stream').then((mod) => mod.default);
        }
        catch {
        }
    }
    const { Readable } = streamModule;
    if (!Readable) {
        throw new SyntaxError('Readable stream not available in the imported stream module');
    }
    if (typeof Readable.fromWeb === 'function') {
        return Readable.fromWeb(webStream);
    }
    const reader = webStream.getReader();
    let closed = false;
    const readable = new Readable({
        async read() {
            if (closed)
                return;
            try {
                const { done, value } = await reader.read();
                if (done) {
                    closed = true;
                    this.push(null);
                }
                else {
                    this.push(Buffer.from(value));
                }
            }
            catch (e) {
                if (!isAbortError(e)) {
                    LoggedError.isTurtlesAllTheWayDownBaby(e, {
                        source: 'convertWebStreamFromNode.read',
                        log: true,
                        critical: false,
                    });
                }
                this.destroy(e instanceof Error ? e : new Error(String(e)));
            }
        },
        emitClose: true,
        destroy(err, callback) {
            if (closed) {
                callback(err);
                return;
            }
            closed = true;
            reader.cancel(err).then(() => callback(err), (e) => callback(e));
        },
    });
    const onClose = () => {
        if (closed)
            return;
        closed = false;
        readable?.off('close', onClose);
    };
    readable.on('close', onClose);
    return readable;
};
const convertWebStreamOnEdge = async (webStream) => {
    const { ReadableWebToNodeStream } = await import('readable-web-to-node-stream');
    return new ReadableWebToNodeStream(webStream);
};
export const webStreamToReadable = (webStream) => {
    if (typeof window === 'undefined' && process.env.NEXT_RUNTIME === 'nodejs') {
        return convertWebStreamOnNode(webStream);
    }
    else {
        return convertWebStreamOnEdge(webStream);
    }
};
export const makeResponse = (v) => {
    const resp = new FetchResponse(v.body, {
        status: v.statusCode,
        headers: v.headers,
    });
    return resp;
};
export const makeJsonResponse = (data, init) => {
    const headers = {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
    };
    const responseInit = {
        status: init?.status,
        headers,
    };
    try {
        if (isRunningOnServer()) {
            const { NextResponse } = require('next/server');
            return NextResponse.json(data, responseInit);
        }
    }
    catch (_error) {
        log((l) => l.warn('cannot use NextResponse from the edge: ', safeSerialize(_error)));
    }
    const jsonBody = JSON.stringify(data);
    const bodyBuffer = Buffer.from(jsonBody, 'utf8');
    const resp = new FetchResponse(bodyBuffer, responseInit);
    return resp;
};
export const makeStreamResponse = (stream, init = {}) => {
    return new FetchResponse(stream, init);
};
//# sourceMappingURL=index.js.map