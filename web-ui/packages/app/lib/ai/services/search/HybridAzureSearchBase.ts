import { env } from '@compliance-theater/env';
import type {
  VectorBlock,
  AiSearchResult,
  HybridSearchPayload,
  AiSearchResultEnvelope,
} from './types';
import {
  HybridSearchClient,
  HybridSearchExecutionContext,
} from './HybridSearchBase';
import { LoggedError, log, logEvent } from '@compliance-theater/logger';
import { resolveFetchService } from '@/lib/fetch-service';
import { performance } from 'perf_hooks';

const fetch = resolveFetchService();

type SearchMeta = {
  attributes: Array<{ key: string; value: unknown }>;
};

export abstract class HybridAzureSearchClient<
  TOptions extends { count?: boolean } & Record<string, unknown>,
> extends HybridSearchClient<TOptions> {
  protected static readonly parseId = (metadata: SearchMeta): string | undefined => {
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
          data: { options, query },
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
                HybridAzureSearchClient.parseId(doc.metadata as SearchMeta) ??
                doc.id,
              content: doc.content,
              metadata:
                HybridAzureSearchClient.parseMetadata(doc.metadata as SearchMeta) ??
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

  protected async retrieveCandidates(
    context: HybridSearchExecutionContext<TOptions>,
  ): Promise<AiSearchResultEnvelope> {
    const { naturalQuery, options, embeddingVector, topK, page, exhaustive } =
      context;
    const url = this.getServiceUrl();

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
      semanticConfiguration: 'default',
      select: 'content,id,metadata',
      ...(options?.count ? { count: true } : {}),
      ...(page > 1 ? { skip: (page - 1) * topK } : {}),
    };
    this.appendScopeFilter(payload, options);

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
    const ret = HybridAzureSearchClient.parseResponse(body, naturalQuery, options);
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
  }
}
