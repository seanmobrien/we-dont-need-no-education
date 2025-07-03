import { db } from '@/lib/drizzle-db';
import { LoggedError } from '@/lib/react-util';
import { DocumentResourceIndex } from '../documentResource';
import { DocumentIndexResourceToolResult } from '../types';
import { toolCallbackResultFactory } from '../utility';
import {
  getCaseFileDocumentCounter,
  getCaseFileDocumentDurationHistogram,
  caseFileDocumentErrorCounter,
} from './metrics';

/**
 * Maps an external document scope value to its serialized equivalent.
 *
 * @remarks
 * This function standardizes document type naming conventions by converting
 * database/external format names to API/UI format names.
 *
 * @param type - The external document type string to map
 * @returns The standardized document type string
 *
 * @example
 * ```typescript
 * mapDocumentType('key_point') // returns 'key-point'
 * mapDocumentType('cta') // returns 'call-to-action'
 * ```
 */
const mapDocumentType = (
  type: string,
):
  | 'email'
  | 'attachment'
  | 'key-point'
  | 'call-to-action'
  | 'responsive-action'
  | 'note' => {
  switch (type) {
    case 'email':
    case 'attachment':
      return type;
    case 'key_point':
      return 'key-point';
    case 'cta_response':
      return 'responsive-action';
    case 'cta':
      return 'call-to-action';
    default:
      return type as
        | 'email'
        | 'attachment'
        | 'key-point'
        | 'call-to-action'
        | 'responsive-action'
        | 'note';
  }
};
/**
 * Maps a standardized document type to its database/external equivalent.
 *
 * @remarks
 * This function performs the reverse mapping of mapDocumentType, converting
 * API/UI format names back to database/external format names.
 *
 * @param type - The standardized document type string to map
 * @returns The external/database document type string
 *
 * @example
 * ```typescript
 * mapToDocumentType('key-point') // returns 'key_point'
 * mapToDocumentType('call-to-action') // returns 'cta'
 * ```
 */
const mapToDocumentType = (type: string): string => {
  switch (type) {
    case 'key-point':
      return 'key_point';
    case 'responsive-action':
      return 'cta_response';
    case 'call-to-action':
      return 'cta';
    default:
      return type;
  }
};

/**
 * Retrieves an index of all case file documents with optional scope filtering.
 *
 * @remarks
 * This function provides a lightweight way to retrieve document metadata without
 * the full document content. It supports filtering by document types and returns
 * essential identifying information for each document.
 *
 * @param params - The parameters for document index retrieval
 * @param params.scope - Optional array of document types to filter by
 * @returns A promise that resolves to a ToolCallbackResult containing an array of DocumentResourceIndex
 *
 * @example
 * ```typescript
 * // Get all documents
 * const allDocs = await getCaseFileDocumentIndex({});
 *
 * // Get only emails and attachments
 * const filtered = await getCaseFileDocumentIndex({
 *   scope: ['email', 'attachment']
 * });
 * ```
 */
export const getCaseFileDocumentIndex = async ({
  scope: scopeFromProps,
}: {
  scope?: Array<
    | 'email'
    | 'attachment'
    | 'core-document'
    | 'key-point'
    | 'call-to-action'
    | 'responsive-action'
    | 'note'
  >;
}): Promise<DocumentIndexResourceToolResult> => {
  const startTime = Date.now();

  const attributes = {
    has_scope: Boolean(scopeFromProps?.length),
    scope_count: scopeFromProps?.length || 0,
  };

  try {
    const scope = (scopeFromProps ?? []).map((s) =>
      mapToDocumentType(String(s)),
    );
    const index = await db.query.documentUnits
      .findMany({
        ...(scope.length > 0
          ? { where: (du, { inArray }) => inArray(du.documentType, scope) }
          : {}),
        columns: {
          unitId: true,
          emailId: true,
          attachmentId: true,
          documentPropertyId: true,
          documentType: true,
          createdOn: true,
        },
      })
      .then((documents) =>
        documents.map((doc) => ({
          ...doc,
          createdOn: new Date(doc.createdOn ?? Date.now()),
          documentType: mapDocumentType(doc.documentType ?? ''),
        })),
      );

    const duration = Date.now() - startTime;

    // Record success metrics
    getCaseFileDocumentCounter.add(1, {
      ...attributes,
      operation_type: 'index',
      status: 'success',
      result_count: index.length,
    });

    getCaseFileDocumentDurationHistogram.record(duration, {
      ...attributes,
      operation_type: 'index',
      status: 'success',
    });

    return toolCallbackResultFactory(index);
  } catch (error) {
    const duration = Date.now() - startTime;

    caseFileDocumentErrorCounter.add(1, {
      ...attributes,
      error_type: 'index_error',
    });

    getCaseFileDocumentDurationHistogram.record(duration, {
      ...attributes,
      operation_type: 'index',
      status: 'error',
    });

    return toolCallbackResultFactory<Array<DocumentResourceIndex>>(
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error retrieving case file document index',
        data: { scope: scopeFromProps },
      }),
    );
  }
};
