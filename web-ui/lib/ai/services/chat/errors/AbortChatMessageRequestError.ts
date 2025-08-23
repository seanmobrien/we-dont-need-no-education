/**
 * Custom error thrown when a request is aborted
 */
export class AbortChatMessageRequestError extends Error {
  constructor(public readonly requestId: string) {
    super(`Chat message request ${requestId} was aborted`);
    this.name = 'AbortChatMessageRequestError';
  }
}