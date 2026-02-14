import type { StreamingStrategyDeps } from './fetch-types';
import type { Readable } from 'stream';
export declare class StreamingStrategy {
    private deps;
    constructor(deps: StreamingStrategyDeps);
    detectStreamingResponse(headers: Record<string, string>): boolean;
    handlePureStreaming(cacheKey: string, stream: Readable, headers: Record<string, string>, statusCode: number, span: {
        setAttribute(key: string, value: unknown): void;
    }, shouldReleaseSemaphore?: boolean): Response;
}
//# sourceMappingURL=streaming-strategy.d.ts.map