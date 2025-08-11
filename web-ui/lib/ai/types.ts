import { UIMessage } from 'ai';
import './core/unions';
import { AiModelType } from './core/unions';
import { LanguageModelV1FilePart, LanguageModelV1ImagePart, LanguageModelV1ProviderMetadata, LanguageModelV1ReasoningPart, LanguageModelV1RedactedReasoningPart, LanguageModelV1TextPart, LanguageModelV1ToolCallPart, LanguageModelV1ToolResultPart } from '@ai-sdk/provider';

export type { LanguageModelV1ProviderMetadata, LanguageModelV1ToolResultPart };

export type LanguageModelV1MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export type LanguageModelV1Message = (
  | {
      role: 'system';
      content: string | Array<LanguageModelV1TextPart>;
    }
  | {
      role: 'user';
      content: Array<
        | LanguageModelV1TextPart
        | LanguageModelV1ImagePart
        | LanguageModelV1FilePart
      >;
    }
  | {
      role: 'assistant';
      content: Array<
        | LanguageModelV1TextPart
        | LanguageModelV1FilePart
        | LanguageModelV1ReasoningPart
        | LanguageModelV1RedactedReasoningPart
        | LanguageModelV1ToolCallPart
      >;
    }
  | {
      role: 'tool';
      content: Array<LanguageModelV1ToolCallPart | LanguageModelV1ToolResultPart>;
    }
) & {
  /**
   * Additional provider-specific metadata. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerMetadata?: LanguageModelV1ProviderMetadata;
};
export type LanguageModelV1Prompt = Array<LanguageModelV1Message>;


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

export type LanguageModelV1MessageExt = LanguageModelV1Prompt;

export type ChatRequestMessage = {
  messages: UIMessage[];
  id?: string;
  data?: {
    [key: string]: unknown;
    model: AiModelType;
    page: string;
    threadId: string;
    messageId?: string;
    writeEnabled?: boolean;
    memoryDisabled?: boolean;
  };
};

