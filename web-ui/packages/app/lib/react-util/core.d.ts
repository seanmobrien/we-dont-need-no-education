export { isError, isRecord } from './utility-methods';
export { LoggedError } from './errors/logged-error';
import { AbortChatMessageRequestError } from '@/lib/ai/services/chat/errors/abort-chat-message-request-error';
import { MessageTooLargeForQueueError } from '@/lib/ai/services/chat/errors/message-too-large-for-queue-error';
export declare function isAbortChatMessageRequestError(value: unknown): value is AbortChatMessageRequestError;
export declare function isMessageTooLargeForQueueError(value: unknown): value is MessageTooLargeForQueueError;
//# sourceMappingURL=core.d.ts.map