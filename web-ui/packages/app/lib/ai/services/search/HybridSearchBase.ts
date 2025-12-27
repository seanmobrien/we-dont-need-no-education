import { env } from '@/lib/site-util/env';
import { type IEmbeddingService, EmbeddingService } from '../embedding';
import type {
  HybridSearchOptions,
  VectorBlock,
  AiSearchResult,
  HybridSearchPayload,
  AiSearchResultEnvelope,
} from './types';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { fetch } from '@/lib/nextjs-util/server/fetch';
import { log, logEvent } from '@compliance-theater/lib-logger';
import { performance } from 'perf_hooks';

type SearchMeta = {
  attributes: Array<{ key: string; value: unknown }>;
};

export abstract class HybridSearchClient<TOptions extends HybridSearchOptions> {
  protected static readonly parseId = (
    metadata: SearchMeta,
  ): string | undefined => {
    const found = metadata?.attributes?.find((m) => m.key === 'id')?.value;
    return found ? String(found) : undefined;
  };

  protected static readonly parseMetadata = (
    metadata: SearchMeta,
  ): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    const processExisting = (
      key: string,
      attr: { value: unknown },
      arrayByDefault = false,
    ) => {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(attr.value);
      } else if (existing !== undefined) {
        result[key] = [existing, attr.value];
      } else {
        result[key] = arrayByDefault ? [attr.value] : attr.value;
      }
    };
    metadata?.attributes?.forEach((attr) => {
      if (!attr.value) return;
      const key = attr.key;
      const m = key.match(/^(.+?)(\d+)$/);
      if (m && m.at(1)) {
        processExisting(m[1], attr, true);
      } else {
        processExisting(key, attr);
      }
    });
    return result;
  };

  protected static readonly parseResponse = <TOptions>(
    json: {
      error?: { code?: string; message?: string };
      value?: Record<string, unknown>[];
      '@odata.count'?: number;
      '@odata.nextLink'?: string;
    },
    query: string,
    options: TOptions,
  ): AiSearchResultEnvelope => {
    if (json.error) {
      const { code, message } = json.error;
      throw new Error(
        `Error in search response: ${message || '[no message]'}` +
          ` (code: ${code || '[no code]'})\nRaw: ${JSON.stringify(json)}`,
      );
    }

    if (!Array.isArray(json.value)) {
      log((l) =>
        l.warn({
          message: `No 'value' array in response. query=${query} options=${JSON.stringify(options)}`,
          data: {
            options,
            query,
          },
        }),
      );
      return { results: [] };
    }

    if (json.value.length === 0) {
      log((l) =>
        l.warn({
          message: `No results for query=${query} options=${JSON.stringify(options)}`,
          data: { options, query },
        }),
      );
      return { results: [] };
    }

    return {
      results: json.value
        .map((doc: Record<string, unknown>, idx: number) => {
          try {
            return {
              id:
                HybridSearchClient.parseId(doc.metadata as SearchMeta) ??
                doc.id,
              content: doc.content,
              metadata:
                HybridSearchClient.parseMetadata(doc.metadata as SearchMeta) ??
                doc.metadata,
              score: doc['@search.rerankerScore'] ?? doc['@search.score'] ?? 0,
            } as AiSearchResult;
          } catch (e) {
            LoggedError.isTurtlesAllTheWayDownBaby(e, {
              log: true,
              message: `Error parsing hit #${idx}`,
              data: {
                query,
                options,
              },
            });
            return null;
          }
        })
        .filter((r: AiSearchResult | null): r is AiSearchResult => !!r),
      ...({
        total: json['@odata.count'] ? Number(json['@odata.count']) : undefined,
        continuationToken: json['@odata.nextLink'] ?? undefined,
      } as Partial<AiSearchResultEnvelope>),
    };
  };

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

  protected abstract getSearchIndexName(): string;

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
      const timer = performance.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-ms-azs-return-searchid': 'true',
          'Access-Control-Expose-Headers': 'x-ms-azs-searchid',
          'Content-Type': 'application/json',
          'api-key': env('AZURE_AISEARCH_KEY') ?? '',
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      const elapsed = performance.now() - timer;
      const ret = HybridSearchClient.parseResponse(
        body,
        naturalQuery,
        options ?? ({} as TOptions),
      );
      const searchId = res.headers?.get('x-ms-azs-searchid');
      if (searchId) {
        ret.searchId = searchId;
        logEvent('Search', {
          SearchServiceName: 'schoollawsearch',
          SearchId: searchId,
          IndexName: this.getSearchIndexName(),
          QueryTerms: naturalQuery,
          Latency: elapsed,
          ResultCount: ret.results?.length ?? 0,
          TopThreeById: ret.results
            ?.slice(0, 3)
            .map((r) => r.id)
            .join(','),
          ScoringProfile: 'Hybrid',
        });
      }
      return ret;
    } catch (err) {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        message: 'Error performing hybrid search',
        source: 'HybridSearchClient.hybridSearch',
        data: {
          naturalQuery,
          options,
          payload,
        },
      });
      logEvent('error', 'SearchError', {
        SearchServiceName: 'schoollawsearch',
        QueryTerms: naturalQuery,
        ErrorMessage: le.toString(),
      });
      throw le;
    }
  }
}
