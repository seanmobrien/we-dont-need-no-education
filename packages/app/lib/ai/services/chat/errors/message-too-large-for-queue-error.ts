export class MessageTooLargeForQueueError extends Error {
  public readonly name = 'MessageTooLargeForQueueError';

  constructor(
    public readonly tokenCount: number,
    public readonly maxTokens: number,
    public readonly modelType: string,
  ) {
    super(
      `Message with ${tokenCount} tokens exceeds maximum allowed ${maxTokens} tokens for model ${modelType}`,
    );
    this.name = 'MessageTooLargeForQueueError';
  }
}