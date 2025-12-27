export declare class MessageTooLargeForQueueError extends Error {
    readonly tokenCount: number;
    readonly maxTokens: number;
    readonly modelType: string;
    readonly name = "MessageTooLargeForQueueError";
    constructor(tokenCount: number, maxTokens: number, modelType: string);
}
//# sourceMappingURL=message-too-large-for-queue-error.d.ts.map