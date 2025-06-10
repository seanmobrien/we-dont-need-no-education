import { UIMessage } from 'ai';
import './core/unions';
import { AiModelType } from './core/unions';

/**
 * Defines the number of dimensions for embeddings.
 * Small is 1536 dimensions, Large is 3072 dimensions.
 */
export enum EmbeddingDimensions {
  Small = 1536,
  Large = 3072,
}

export type EmbeddingOptions = {
  /**
   * Sets the number of dimensions embedding is performed at.  Can be either 1536 (small) or 3072 (large).
   * Defaults to 3072.
   */
  dimensions?: EmbeddingDimensions;
  /**
   * Sets the user id associated with the model.
   */
  user?: string;
  /**
   * Override the maximum number of embeddings per call.
   */
  maxEmbeddingsPerCall?: number;
  /**
   * Override the parallelism of embedding calls.
   */
  supportsParallelCalls?: boolean;
};

export type ChatOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  user?: string;
};

export type ChatRequestMessage = {
  messages: UIMessage[];
  data?: {
    [key: string]: unknown;
    model: AiModelType;
    page: string;
    threadId: string;
    writeEnabled?: boolean;
  };
};
