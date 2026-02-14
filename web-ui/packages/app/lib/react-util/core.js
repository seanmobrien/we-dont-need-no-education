export { isError, isRecord } from './utility-methods';
import { AbortChatMessageRequestError } from '@/lib/ai/services/chat/errors/abort-chat-message-request-error';
import { MessageTooLargeForQueueError } from '@/lib/ai/services/chat/errors/message-too-large-for-queue-error';
import { isError } from './utility-methods';
export function isAbortChatMessageRequestError(value) {
    if (value instanceof AbortChatMessageRequestError) {
        return true;
    }
    return (isError(value) &&
        value.name === 'AbortChatMessageRequestError' &&
        'requestId' in value &&
        (typeof value.requestId === 'string' ||
            value.requestId === undefined));
}
export function isMessageTooLargeForQueueError(value) {
    if (value instanceof MessageTooLargeForQueueError) {
        return true;
    }
    return (isError(value) &&
        value.name === 'MessageTooLargeForQueueError' &&
        'tokenCount' in value &&
        'maxTokens' in value &&
        'modelType' in value &&
        typeof value.tokenCount === 'number' &&
        typeof value.maxTokens === 'number' &&
        typeof value.modelType === 'string');
}
//# sourceMappingURL=core.js.map