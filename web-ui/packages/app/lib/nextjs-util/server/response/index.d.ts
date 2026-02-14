import type { Readable as ReadableType } from 'node:stream';
export declare class FetchResponse extends Response {
    private _buffer;
    streamBody: ReadableStream<Uint8Array<ArrayBuffer>> | null;
    private _status;
    private _bodyUsed;
    constructor(body: Buffer | ReadableStream<Uint8Array<ArrayBuffer>> | null, init?: {
        status?: number;
        headers?: Record<string, string>;
    });
    get status(): number;
    get bodyUsed(): boolean;
    get body(): ReadableStream<Uint8Array<ArrayBuffer>> | null;
    get ok(): boolean;
    private consumeStream;
    text(): Promise<string>;
    json(): Promise<unknown>;
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<Blob>;
    clone(): Response;
    stream(): ReadableStream<Uint8Array<ArrayBuffer>>;
}
export default FetchResponse;
export declare const nodeStreamToReadableStream: (nodeStream: NodeJS.ReadableStream) => ReadableStream<Uint8Array<ArrayBuffer>>;
export declare const webStreamToReadable: (webStream: ReadableStream) => Promise<ReadableType>;
export declare const makeResponse: (v: {
    body: Buffer;
    headers: Record<string, string>;
    statusCode: number;
}) => Response;
export declare const makeJsonResponse: (data: unknown, init?: ResponseInit) => Response;
export declare const makeStreamResponse: (stream: ReadableStream<Uint8Array<ArrayBuffer>>, init?: {
    status?: number;
    headers?: Record<string, string>;
}) => Response;
//# sourceMappingURL=index.d.ts.map