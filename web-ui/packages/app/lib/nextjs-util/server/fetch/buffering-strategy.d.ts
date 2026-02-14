import type { BufferingStrategyDeps } from './fetch-types';
import type { Readable } from 'stream';
export interface BufferedResult {
    response: Response;
    mode: 'buffered' | 'streaming';
}
export declare class BufferingStrategy {
    private deps;
    constructor(deps: BufferingStrategyDeps);
    handleBufferedResponse(cacheKey: string, stream: Readable, headers: Record<string, string>, statusCode: number, url: string, span: {
        setAttribute(key: string, value: unknown): void;
    }, shouldReleaseSemaphore?: boolean): Promise<BufferedResult>;
    private releaseSemaphore;
    private cacheBufferedToRedis;
}
//# sourceMappingURL=buffering-strategy.d.ts.map