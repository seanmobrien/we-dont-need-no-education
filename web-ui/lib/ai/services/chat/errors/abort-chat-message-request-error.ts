export class AbortChatMessageRequestError extends Error {
  public readonly name = 'AbortChatMessageRequestError';

  constructor(public readonly requestId: string) {
    super(`Chat message request ${requestId} was aborted`);
    this.name = 'AbortChatMessageRequestError';
  }
}