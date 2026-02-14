export class AbortChatMessageRequestError extends Error {
    requestId;
    name = 'AbortChatMessageRequestError';
    constructor(requestId) {
        super(`Chat message request ${requestId} was aborted`);
        this.requestId = requestId;
        this.name = 'AbortChatMessageRequestError';
    }
}
//# sourceMappingURL=abort-chat-message-request-error.js.map