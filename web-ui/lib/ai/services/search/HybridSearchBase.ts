// AzureBaseSearchClient.ts

import { env } from '/lib/site-util/env';
import { type IEmbeddingService, EmbeddingService } from '../embedding';
import type {
  HybridSearchOptions,
  VectorBlock,
  AiSearchResult,
  HybridSearchPayload,
  AiSearchResultEnvelope,
} from './types';
import { LoggedError } from '/lib/react-util/errors/logged-error';
import { fetch } from '/lib/nextjs-util/fetch';
import { log, logEvent } from '/lib/logger';
import { performance } from 'perf_hooks';

/**
 * Raw metadata structure returned by Azure AI Search (or compatible hybrid search endpoint)
 * for each individual hit. It is composed of an array of key/value pairs instead of a flat
 * object so that multiple instances of the same logical key (e.g. multi‑value tags) can be
 * preserved and later reconstructed into arrays.
 */
type SearchMeta = {
  attributes: Array<{ key: string; value: unknown }>;
};

/**
 * Abstract base class, parameterized by your scope‐type (e.g. policyTypeId).
 */
export abstract class HybridSearchClient<TOptions extends HybridSearchOptions> {
  /**
   * Extracts the canonical document identifier from a metadata bag.
   *
   * The Azure index stores scalar metadata in the attributes collection. We look for an
   * attribute with key 'id' and coerce its value to a string. If not present, the caller
   * can fall back to the root level document's own `id` field.
   *
   * @param metadata Raw metadata attribute set for a single hit.
   * @returns Identifier string if present; otherwise undefined.
   */
  protected static readonly parseId = (
    metadata: SearchMeta,
  ): string | undefined => {
    const found = metadata?.attributes?.find((m) => m.key === 'id')?.value;
    return found ? String(found) : undefined;
  };
  /**
   * Normalizes raw attribute key/value pairs into a flat record with arrays for repeated
   * logical keys. Keys that end with a trailing number (e.g. `tag1`, `tag2`) are treated as
   * a single logical key (`tag`) whose value becomes an array preserving insertion order.
   *
   * @example
   * Input attributes: [{ key: 'tag1', value: 'a' }, { key: 'tag2', value: 'b' }]
   * Output record: { tag: ['a','b'] }
   *
   * Non‑numeric‑suffixed keys map directly to a scalar value. If a non‑numeric key repeats
   * it is automatically promoted to an array of values.
   *
   * @param metadata Raw metadata attribute set for a single hit.
   * @returns Flattened, consumer‑friendly metadata object.
   */
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
  /**
   * INTERNAL: Converts a raw Azure Search JSON response into the strongly typed
   * {@link AiSearchResultEnvelope} consumed by higher layers.
   *
   * Responsibilities:
   *  - Detect and surface service level errors (throws with contextual details)
   *  - Gracefully handle empty / missing result sets
   *  - Map each hit into a normalized structure (id, content, metadata, score)
   *  - Extract optional total counts and continuation tokens
   *
   * The method is static and pure: it performs no logging unless an error occurs
   * while mapping an individual hit, in which case a LoggedError is emitted and
   * the offending hit is omitted from the final result list.
   *
   * @param json Raw JSON body from the search API.
   * @param query Original natural language query string provided by caller.
   * @param options Options used during the search (forwarded for context in errors/warnings).
   * @throws Error when the service reports an error block.
   */
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
  /**
   * Underlying embedding service responsible for turning the natural query into
   * a numeric vector suitable for vector portion of the hybrid search.
   */
  protected readonly embeddingService: IEmbeddingService;

  /**
   * Creates a new HybridSearchClient.
   *
   * Accepts either:
   *  1. An {@link IEmbeddingService} implementation (used directly), or
   *  2. An options object with optional `embeddingService` property, or
   *  3. Nothing – in which case a new default {@link EmbeddingService} is provisioned.
   *
   * @param embeddingServiceOrOptions Optional embedding service instance or configuration wrapper.
   * @throws Error if the argument is neither an embedding service nor an options object.
   */
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
   * Implemented by concrete subclasses to return the Azure AI Search index name
   * to target (e.g. documents vs policies). Should be stable and usually sourced
   * from configuration / environment variables.
   */
  protected abstract getSearchIndexName(): string;

  /**
   * Gives subclasses a chance to mutate the outgoing payload with filter logic
   * derived from user / domain specific options (e.g. restricting by document
   * type, policy jurisdiction, ownership, etc.).
   *
   * Implementations SHOULD be pure (no side effects beyond the provided payload) and
   * SHOULD NOT remove existing required properties.
   *
   * @param payload Mutable payload object that will be serialized for the search request.
   * @param options User supplied search options.
   */
  protected abstract appendScopeFilter(
    payload: HybridSearchPayload,
    options: TOptions,
  ): void;

  /**
   * Returns the Azure Search service API version in use. Centralized here to
   * simplify coordinated upgrades.
   */
  protected getSearchApiVersion(): string {
    return '2025-05-01-preview';
  }

  /**
   * Builds the fully qualified search endpoint URL including index path and API version.
   */
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
    /**
     * Executes a hybrid (semantic + vector) search against the configured index.
     *
     * Workflow:
     *  1. Generate / fetch an embedding for the natural language query.
     *  2. Construct a vector query block (k expanded to at least 50 for richer recall).
     *  3. Build the hybrid payload (semantic configuration, paging, selection, filters).
     *  4. POST to the Azure AI Search endpoint with API key authentication.
     *  5. Parse, normalize, and return results via {@link HybridSearchClient.parseResponse}.
     *
     * Error Handling:
     *  - Network / fetch errors are wrapped in a {@link LoggedError} with contextual metadata.
     *  - Service reported errors (embedded in JSON) throw early inside parseResponse.
     *
     * @param naturalQuery User provided freeform text query.
     * @param options Domain specific hybrid search options (paging, filters, counts, etc.).
     * @returns Envelope containing normalized results plus optional total/continuation data.
     */
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
