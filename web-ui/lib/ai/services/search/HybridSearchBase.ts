// AzureBaseSearchClient.ts

import { env } from '@/lib/site-util/env';
import { IEmbeddingService, EmbeddingService } from '../embedding';
import {
  HybridSearchOptions,
  VectorBlock,
  AiSearchResult,
  HybridSearchPayload,
  AiSearchResultEnvelope,
} from './types';
import { LoggedError } from '@/lib/react-util';
import { fetch } from '@/lib/nextjs-util/fetch';


type SearchMeta = {
  attributes: Array<{ key: string; value: unknown }>;
};

/**
 * Abstract base class, parameterized by your scope‐type (e.g. policyTypeId).
 */
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
    } else {
      if ('embeddingService' in embeddingServiceOrOptions) {
        this.embeddingService =
          embeddingServiceOrOptions.embeddingService ?? new EmbeddingService();
      } else if ('embed' in embeddingServiceOrOptions) {
        this.embeddingService = embeddingServiceOrOptions;
      } else {
        throw new Error(
          'Invalid argument: expected an IEmbeddingService or an object with embeddingService property',
          { cause: embeddingServiceOrOptions },
        );
      }
    }
  }

  /**
   * Subclasses must tell us which index to query.
   */
  protected abstract getSearchIndexName(): string;

  /**
   * Subclasses must apply any policy‐scope filter
   * directly into the JSON payload.
   */
  protected abstract appendScopeFilter(
    payload: HybridSearchPayload,
    options: TOptions,
  ): void;

  protected getSearchApiVersion(): string {
    return '2025-05-01-preview';
  }

  protected getServiceUrl(): string {
    return (
      `${env('AZURE_AISEARCH_ENDPOINT')}` +
      `/indexes/${this.getSearchIndexName()}` +
      `/docs/search?api-version=${this.getSearchApiVersion()}`
    );
  }

  public async hybridSearch(
    naturalQuery: string,
    options?: TOptions,
  ): Promise<AiSearchResultEnvelope> {
    const {
      hitsPerPage: topK = 5, // default to 15 results
      page = 1, // default to first page
      exhaustive = false,
    } = options ?? {};
    const url = this.getServiceUrl();

    // 1) ensure we have an embedding
    const embeddingVector = await this.embeddingService.embed(naturalQuery);
    // 2) build our vector‐query block

    const vectorBlock: VectorBlock = {
      vector: embeddingVector,
      kind: 'vector',
      fields: 'content_vector',
      k: Math.max(50, topK),
      exhaustive,
    };

    const payload: HybridSearchPayload = {
      search: naturalQuery,
      vectorQueries: [vectorBlock],
      top: topK,
      queryType: 'semantic',
      semanticConfiguration: 'semantic-search-config',
      select: 'content,id,metadata',
      ...(options?.count ? { count: true } : {}),
      ...(page > 1 ? { skip: (page - 1) * topK } : {}),
    };
    this.appendScopeFilter(payload, options ?? ({} as TOptions));

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': env('AZURE_AISEARCH_KEY') ?? '',
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      return this.parseResponse(
        body,
        naturalQuery,
        options ?? ({} as TOptions),
      );
    } catch (err) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        message: 'Error performing hybrid search',
        source: 'HybridSearchClient.hybridSearch',
        data: {
          naturalQuery,
          options,
          payload,
        },
      });
    }
  }
  protected parseId(metadata: SearchMeta): string | undefined {
    const found = metadata?.attributes?.find(m => m.key === 'id')?.value;
    return found ? String(found) : undefined;
  }

  /**
   * INTERNAL: parse the raw JSON into our AiSearchResultEnvelope
   * @param json - the raw JSON response from the search service
   * @param query - the original search query
   * @param options - the search options used
   * @returns the parsed AiSearchResultEnvelope
   */
  protected parseResponse(
    json: {
      error?: { code?: string; message?: string };
      value?: Record<string, unknown>[];
      '@odata.count'?: number;
      '@odata.nextLink'?: string;
    },
    query: string,
    options: TOptions,
  ): AiSearchResultEnvelope {
    if (json.error) {
      const { code, message } = json.error;
      throw new Error(
        `Error in search response: ${message || '[no message]'}` +
          ` (code: ${code || '[no code]'})\nRaw: ${JSON.stringify(json)}`,
      );
    }

    if (!Array.isArray(json.value)) {
      console.warn(
        `No 'value' array in response. query=${query} options=`,
        options,
      );
      return { results: [] };
    }

    if (json.value.length === 0) {
      console.warn(`No results for query=${query} options=`, options);
      return { results: [] };
    }

    return {
      results: json.value
        .map((doc: Record<string, unknown>, idx: number) => {
          try {
            return {
              id: this.parseId(doc.metadata as SearchMeta) ?? doc.id,
              content: doc.content,
              metadata: doc.metadata,
              score: doc['@search.rerankerScore'] ?? doc['@search.score'] ?? 0,
            } as AiSearchResult;
          } catch (e) {
            console.error(`Error parsing hit #${idx}`, doc, e);
            return null;
          }
        })
        .filter((r: AiSearchResult | null): r is AiSearchResult => !!r),
      ...({
        total: json['@odata.count'] ? Number(json['@odata.count']) : undefined,
        continuationToken: json['@odata.nextLink'] ?? undefined,
      } as Partial<AiSearchResultEnvelope>),
    };
  }
}
