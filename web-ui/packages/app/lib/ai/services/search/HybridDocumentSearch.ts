import { env } from '@compliance-theater/env';
import { CaseFileSearchOptions } from '../../tools/types';
import { CaseFileSearchScopeType } from '../../tools/unions';
import { HybridSearchClient } from './HybridSearchBase';
import { HybridSearchPayload } from './types';
import { IEmbeddingService } from '../embedding';
import { getAccessibleUserIds } from '@compliance-theater/auth/lib/resources/case-file/case-file-helpers';
import type { LikeNextRequest } from '@compliance-theater/types/lib/nextjs/types/like-nextrequest';

export type HybridDocumentSearchOptions = {
  embeddingService?: IEmbeddingService;
  authorizationContext?: string | LikeNextRequest;
  enforceAuthorization?: boolean;
};

export class HybridDocumentSearch extends HybridSearchClient<CaseFileSearchOptions> {
  private readonly authorizationContext?: string | LikeNextRequest;
  private readonly enforceAuthorization: boolean;
  private accessibleUserIdsForCurrentSearch?: number[];

  constructor(options?: IEmbeddingService | HybridDocumentSearchOptions) {
    const searchOptions =
      options && typeof options === 'object' && !('embed' in options);
    super(searchOptions ? { embeddingService: options.embeddingService } : options);
    if (searchOptions) {
      this.authorizationContext = options.authorizationContext;
      this.enforceAuthorization = options.enforceAuthorization === true;
    } else {
      this.enforceAuthorization = false;
    }
  }

  protected getSearchIndexName(): string {
    return env('AZURE_AISEARCH_DOCUMENTS_INDEX_NAME');
  }

  protected appendScopeFilter(
    payload: HybridSearchPayload,
    options: CaseFileSearchOptions,
  ): void {
    const {
      scope: policyType,
      emailId,
      threadId,
      attachmentId,
      documentId,
      replyToDocumentId,
      relatedToDocumentId,
    } = options ?? {};
    let filterValues: string[] = [];
    const validTypes: Record<CaseFileSearchScopeType, Array<string>> = {
      email: ['email'],
      attachment: ['attachment'],
      'key-point': ['key_point'],
      'call-to-action': ['cta'],
      'responsive-action': ['cta_response'],
      note: ['note'],
      'core-document': ['email', 'attachment'],
    };
    const filters: Array<string> = [];

    if (Array.isArray(policyType)) {
      filterValues = policyType
        .flatMap((type) => validTypes[type])
        .filter(Boolean);
    } else if (typeof policyType === 'string') {
      const mapped = validTypes[policyType];
      if (mapped) {
        filterValues = [mapped];
      }
    }

    if (filterValues.length > 0) {
      const orFilters = filterValues
        .map(
          (val) =>
            `metadata/attributes/any(a: a/key eq 'document_type' and a/value eq '${val}')`,
        )
        .join(' or ');
      filters.push(`(${orFilters})`);
    }

    if (emailId) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'email_id' and a/value eq '${emailId}')`,
      );
    }
    if (threadId) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'thread_id' and a/value eq '${threadId}')`,
      );
    }
    if (attachmentId) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'attachment_id' and a/value eq '${attachmentId}')`,
      );
    }
    if (documentId) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'id' and a/value eq '${documentId}')`,
      );
    }
    if (replyToDocumentId) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'parent_email_id' and a/value eq '${replyToDocumentId}')`,
      );
    }
    if (relatedToDocumentId) {
      filters.push(
        `metadata/attributes/any(a: a/key eq 'relatedEmailId:${relatedToDocumentId}')`,
      );
    }
    if (filters.length > 0) {
      payload.filter = filters.join(' and ');
    }
    if (this.enforceAuthorization) {
      this.appendUserAuthorizationFilter(
        payload,
        this.accessibleUserIdsForCurrentSearch ?? [],
      );
    }
  }

  private appendUserAuthorizationFilter(
    payload: HybridSearchPayload,
    accessibleUserIds: number[],
  ): void {
    const authFilter =
      accessibleUserIds.length === 0
        ? `metadata/attributes/any(a: a/key eq 'user_id' and a/value eq '__no_access__')`
        : `(${accessibleUserIds
            .map(
              (userId) =>
                `metadata/attributes/any(a: a/key eq 'user_id' and a/value eq '${userId}')`,
            )
            .join(' or ')})`;
    payload.filter = payload.filter
      ? `${payload.filter} and ${authFilter}`
      : authFilter;
  }

  public async hybridSearch(
    naturalQuery: string,
    options?: CaseFileSearchOptions,
  ) {
    if (!this.enforceAuthorization) {
      return super.hybridSearch(naturalQuery, options);
    }

    const accessibleUserIds = await getAccessibleUserIds(
      this.authorizationContext,
    );
    this.accessibleUserIdsForCurrentSearch = accessibleUserIds;
    try {
      return await super.hybridSearch(naturalQuery, options);
    } finally {
      this.accessibleUserIdsForCurrentSearch = undefined;
    }
  }
}

export const hybridDocumentSearchFactory = (
  options?: HybridDocumentSearchOptions,
) => new HybridDocumentSearch(options);
