/**
 * @fileoverview Module definition for HybridSearchBase.
 */

import { type IEmbeddingService } from '../embedding';
import type { HybridSearchOptions, AiSearchResultEnvelope } from './types';

declare module '@/lib/ai/services/search/HybridSearchBase' {
  export type HybridSearchExecutionContext<TOptions extends HybridSearchOptions> = {
    naturalQuery: string;
    options: TOptions;
    embeddingVector: number[];
    topK: number;
    page: number;
    exhaustive: boolean;
  };

  export abstract class HybridSearchClient<TOptions extends HybridSearchOptions> {
    protected readonly embeddingService: IEmbeddingService;

    constructor(
      embeddingServiceOrOptions?:
        | IEmbeddingService
        | {
            embeddingService?: IEmbeddingService;
          },
    );

    protected normalizeOptions(options: TOptions): TOptions;
    protected abstract retrieveCandidates(
      context: HybridSearchExecutionContext<TOptions>,
    ): Promise<AiSearchResultEnvelope>;
    protected augmentCandidates(
      context: HybridSearchExecutionContext<TOptions> & {
        envelope: AiSearchResultEnvelope;
      },
    ): Promise<AiSearchResultEnvelope>;

    hybridSearch(
      naturalQuery: string,
      options?: TOptions,
    ): Promise<AiSearchResultEnvelope>;
  }
}
