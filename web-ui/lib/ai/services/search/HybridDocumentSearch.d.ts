/**
 * @fileoverview Module definition for HybridDocumentSearch.
 */

import { CaseFileSearchOptions } from '../../tools/types';
import { HybridSearchClient } from './HybridSearchBase';
import { HybridSearchPayload } from './types';
import { IEmbeddingService } from '../embedding';

declare module '@/lib/ai/services/search/HybridDocumentSearch' {
  /**
   * Concrete hybrid search client specializing in case file (email + attachment + derived
   * document unit) content. Provides filtering semantics for different logical document
   * types as well as cross‑document relational identifiers (threads, replies, relationships).
   */
  export class HybridDocumentSearch extends HybridSearchClient<CaseFileSearchOptions> {
    /**
     * Index name for document corpus (emails, attachments, key points, CTAs, etc.).
     * Derived from environment so deployments can swap indexes without code changes.
     */
    protected getSearchIndexName(): string;

    /**
     * Applies domain specific filters based on provided {@link CaseFileSearchOptions}.
     *
     * Supported filter dimensions:
     *  - scope: Accepts singular or array of logical types which are mapped to concrete
     *           `document_type` values stored in metadata attributes.
     *  - emailId, threadId, attachmentId, documentId: Direct entity scoping.
     *  - replyToDocumentId: Parent / reply chain scoping.
     *  - relatedToDocumentId: Custom relation tag (stored as composite key in metadata).
     *
     * Filtering Strategy:
     *  - Each dimension becomes an OData filter snippet targeting the `metadata/attributes`
     *    collection using `any()` semantics to match the desired attribute key/value pair.
     *  - Multiple dimensions are AND‑combined; multiple document types inside `scope` are OR‑combined.
     *
     * NOTE: This mutation is additive – existing payload properties are preserved.
     */
    protected appendScopeFilter(
      payload: HybridSearchPayload,
      options: CaseFileSearchOptions,
    ): void;
  }

  /**
   * Factory helper for creating a {@link HybridDocumentSearch} instance while optionally
   * injecting a custom embedding service (for testing or alternate vector providers).
   *
   * @param options Optional configuration containing an `embeddingService` override.
   */
  export const hybridDocumentSearchFactory: (options?: {
    embeddingService?: IEmbeddingService;
  }) => HybridDocumentSearch;
}
