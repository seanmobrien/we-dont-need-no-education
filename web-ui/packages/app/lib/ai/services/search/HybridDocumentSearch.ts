import { env } from '@compliance-theater/env';
import { getFeatureFlag } from '@compliance-theater/feature-flags/server';
import { CaseFileSearchOptions } from '../../tools/types';
import { HybridAzureSearchClient } from './HybridAzureSearchBase';
import {
  CaseFileSearchGraphAugmentationProvider,
  CaseFileSearchRetrievalProvider,
  HybridSearchPayload,
  normalizeCaseFileSearchFilters,
  normalizeCaseFileSearchGraphAugmentationProvider,
  normalizeCaseFileSearchRetrievalProvider,
} from './types';
import { IEmbeddingService } from '../embedding';
import { HybridDocumentSearchPostgres } from './HybridDocumentSearchPostgres';
import { augmentCaseFileResultsWithNeo4jSemantics } from './HybridDocumentNeo4jAugmentation';

const CASE_FILE_RETRIEVAL_PROVIDER_FLAG =
  'search_case_file_retrieval_provider' as const;
const CASE_FILE_GRAPH_AUGMENTATION_PROVIDER_FLAG =
  'search_case_file_graph_augmentation_provider' as const;

export class HybridDocumentSearch extends HybridAzureSearchClient<CaseFileSearchOptions> {
  protected getSearchIndexName(): string {
    return env('AZURE_AISEARCH_DOCUMENTS_INDEX_NAME');
  }

  protected appendScopeFilter(
    payload: HybridSearchPayload,
    options: CaseFileSearchOptions,
  ): void {
    const normalized = normalizeCaseFileSearchFilters(options);
    const filters: Array<string> = [];

    if (normalized.scopeDocumentTypes.length > 0) {
      const orFilters = normalized.scopeDocumentTypes
        .map(
          (documentType) =>
            `metadata/attributes/any(a: a/key eq 'document_type' and a/value eq '${documentType}')`,
        )
        .join(' or ');
      filters.push(`(${orFilters})`);
    }

    if (normalized.emailId) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'email_id' and a/value eq '${normalized.emailId}')`,
      );
    }
    if (normalized.threadId != null) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'thread_id' and a/value eq '${normalized.threadId}')`,
      );
    }
    if (normalized.attachmentId != null) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'attachment_id' and a/value eq '${normalized.attachmentId}')`,
      );
    }
    if (normalized.documentId != null) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'id' and a/value eq '${normalized.documentId}')`,
      );
    }
    if (normalized.replyToDocumentId != null) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'parent_email_id' and a/value eq '${normalized.replyToDocumentId}')`,
      );
    }
    if (normalized.relatedToDocumentId != null) {
      filters.push(
        `(metadata/attributes/any(a: a/key eq 'related_documents' and a/value eq '${normalized.relatedToDocumentId}') or metadata/attributes/any(a: a/key eq 'relatedEmailId:${normalized.relatedToDocumentId}'))`,
      );
    }
    if (filters.length > 0) {
      payload.filter = filters.join(' and ');
    }
  }
}

export class RoutedHybridDocumentSearch {
  readonly #azureClient: HybridDocumentSearch;
  readonly #postgresClient: HybridDocumentSearchPostgres;

  constructor(options?: { embeddingService?: IEmbeddingService }) {
    this.#azureClient = new HybridDocumentSearch(options);
    this.#postgresClient = new HybridDocumentSearchPostgres(options);
  }

  async #getRetrievalProvider(): Promise<CaseFileSearchRetrievalProvider> {
    const flag = await getFeatureFlag(CASE_FILE_RETRIEVAL_PROVIDER_FLAG);
    return normalizeCaseFileSearchRetrievalProvider(flag);
  }

  async #getGraphAugmentationProvider(): Promise<CaseFileSearchGraphAugmentationProvider> {
    const flag = await getFeatureFlag(CASE_FILE_GRAPH_AUGMENTATION_PROVIDER_FLAG);
    return normalizeCaseFileSearchGraphAugmentationProvider(flag);
  }

  async hybridSearch(query: string, options?: CaseFileSearchOptions) {
    const [retrievalProvider, graphAugmentationProvider] = await Promise.all([
      this.#getRetrievalProvider(),
      this.#getGraphAugmentationProvider(),
    ]);

    const retrievalClient =
      retrievalProvider === 'postgresql' ? this.#postgresClient : this.#azureClient;
    const retrieved = await retrievalClient.hybridSearch(query, options);

    if (graphAugmentationProvider !== 'neo4j') {
      return retrieved;
    }

    return await augmentCaseFileResultsWithNeo4jSemantics(retrieved, options);
  }
}

export const hybridDocumentSearchFactory = (options?: {
  embeddingService?: IEmbeddingService;
}) => new RoutedHybridDocumentSearch(options);
