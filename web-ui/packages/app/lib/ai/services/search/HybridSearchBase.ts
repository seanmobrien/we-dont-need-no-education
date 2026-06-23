import { type IEmbeddingService, EmbeddingService } from '../embedding';
import type {
  HybridSearchOptions,
  AiSearchResultEnvelope,
} from './types';
import { LoggedError, log, logEvent } from '@compliance-theater/logger';

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
  ) {
    if (!embeddingServiceOrOptions) {
      this.embeddingService = new EmbeddingService();
    } else if (
      typeof embeddingServiceOrOptions === 'object' &&
      'embeddingService' in embeddingServiceOrOptions
    ) {
      this.embeddingService =
        embeddingServiceOrOptions.embeddingService ?? new EmbeddingService();
    } else if (
      typeof embeddingServiceOrOptions === 'object' &&
      'embed' in embeddingServiceOrOptions
    ) {
      this.embeddingService = embeddingServiceOrOptions;
    } else if (
      typeof embeddingServiceOrOptions === 'object' &&
      !Array.isArray(embeddingServiceOrOptions)
    ) {
      this.embeddingService = new EmbeddingService();
    } else {
      throw new Error(
        'Invalid argument: expected an IEmbeddingService or an object with embeddingService property',
        { cause: embeddingServiceOrOptions },
      );
    }
  }

  protected normalizeOptions(options: TOptions): TOptions {
    return options;
  }

  protected abstract retrieveCandidates(
    context: HybridSearchExecutionContext<TOptions>,
  ): Promise<AiSearchResultEnvelope>;

  protected async augmentCandidates(
    context: HybridSearchExecutionContext<TOptions> & {
      envelope: AiSearchResultEnvelope;
    },
  ): Promise<AiSearchResultEnvelope> {
    return context.envelope;
  }

  public async hybridSearch(
    naturalQuery: string,
    options?: TOptions,
  ): Promise<AiSearchResultEnvelope> {
    const {
      hitsPerPage: topK = 5,
      page = 1,
      exhaustive = false,
    } = options ?? {};

    try {
      const normalizedOptions = this.normalizeOptions(options ?? ({} as TOptions));
      const embeddingVector = await this.embeddingService.embed(naturalQuery);
      const context: HybridSearchExecutionContext<TOptions> = {
        naturalQuery,
        options: normalizedOptions,
        embeddingVector,
        topK,
        page,
        exhaustive,
      };
      const envelope = await this.retrieveCandidates(context);
      return await this.augmentCandidates({
        ...context,
        envelope,
      });
    } catch (err) {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        message: 'Error performing hybrid search',
        source: 'HybridSearchClient.hybridSearch',
        data: {
          naturalQuery,
          options,
        },
      });
      log((l) => l.error(le));
      logEvent('error', 'SearchError', {
        QueryTerms: naturalQuery,
        ErrorMessage: le.toString(),
      });
      throw le;
    }
  }
}
