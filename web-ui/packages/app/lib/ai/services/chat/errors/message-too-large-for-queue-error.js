export class MessageTooLargeForQueueError extends Error {
    tokenCount;
    maxTokens;
    modelType;
    name = 'MessageTooLargeForQueueError';
    constructor(tokenCount, maxTokens, modelType) {
        super(`Message with ${tokenCount} tokens exceeds maximum allowed ${maxTokens} tokens for model ${modelType}`);
        this.tokenCount = tokenCount;
        this.maxTokens = maxTokens;
        this.modelType = modelType;
        this.name = 'MessageTooLargeForQueueError';
    }
}
//# sourceMappingURL=message-too-large-for-queue-error.js.map