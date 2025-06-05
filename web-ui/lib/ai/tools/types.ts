import {
  AiSearchResultEnvelope,
  HybridSearchOptions,
} from '../services/search';
import { PolicySearchScopeType, CaseFileSearchScopeType } from './unions';
import {
  DocumentResource,
  EmailResource,
  AttachmentResource,
  DocumentPropertyResource,
  DocumentResourceIndex,
} from './documentResource';
import { violationDetails } from '@/drizzle/schema';

/**
 * Options for performing a policy search, extending {@link HybridSearchOptions}.
 *
 * @remarks
 * This type allows specifying additional search parameters, including the scope of the policy search.
 *
 * @property scope - An optional array of `PolicySearchScopeType` values that define the scope(s) to search within.
 *                   If omitted, the search may apply to all available scopes.
 */
export type PolicySearchOptions = HybridSearchOptions & {
  scope?: PolicySearchScopeType[];
};

/**
 * Options for performing a case file search, extending {@link HybridSearchOptions}.
 *
 * @property {CaseFileSearchScopeType[]} [scope] - Optional array specifying the search scope(s) for case files.
 */
export type CaseFileSearchOptions = HybridSearchOptions & {
  scope?: CaseFileSearchScopeType[];
  emailId?: string; // email_id
  threadId?: string; // thread_id
  attachmentId?: number; // attachment_id
  documentId?: number; // id
  replyToDocumentId?: number; // parent_email_id
  relatedToDocumentId?: number; // relatedEmailIds
};

/**
 * Represents the result of a tool callback operation.
 *
 * @template T The type of the structured result.
 * @property content An array containing a single object with a type of 'text' and the corresponding text content.
 * @property structuredContent An object describing the structured result:
 * - If successful, contains the result of type `T` and `isError: false`.
 * - If an error occurred, contains `result: undefined`, `isError: true`, and an optional error message.
 */
export type ToolCallbackResult<T> = {
  /**
   * An array containing a single object with type 'text' and the text content.
   */
  content: Array<{ type: 'text'; text: string }>;
} & (
  | {
      isError?: true;
      /**
       * An object wrapping the structured return value of the tool callback.
       */
      structuredContent: {
        /**
         * The result of the tool callback operation, always undefined when the operation failed.
         */
        result: {
          /**
           * Indicates whether an error occurred processing the operation - always true in this case.
           */
          isError: true;
          /**
           * An optional error message providing details about the failure.
           */
          message?: string;
          /**
           * An optional cause of the error, which can be any type.
           */
          cause?: unknown;
        };
      };
    }
  | {
      structuredContent: {
        /**
         * The result of the tool callback operation, of array type `T`.
         */
        result: {
          isError: false;
          items?: T extends Array<infer U> ? Array<U> : never;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value?: T extends Array<any> ? never : T;
        };
      };
    }
);

export type {
  DocumentResource,
  EmailResource,
  AttachmentResource,
  DocumentPropertyResource,
  DocumentResourceIndex,
};

/**
 * Represents the result of an AI search tool operation.
 *
 * This type is a specialization of `ToolCallbackResult` that wraps an `AiSearchResultEnvelope`,
 * encapsulating the outcome and data returned by an AI-powered search tool.
 */
export type AiSearchToolResult = ToolCallbackResult<AiSearchResultEnvelope>;

/**
 * Represents the result of a document resource tool operation.
 */
export type DocumentResourceToolResult = ToolCallbackResult<DocumentResource>;

/**
 * Represents the result of a tool operation that retrieves multiple document resources.
 */
export type MultipleDocumentResourceToolResult = ToolCallbackResult<
  Array<DocumentResource>
>;

export type DocumentIndexResourceToolResult = ToolCallbackResult<
  Array<DocumentResourceIndex>
>;

export type CaseFileAmendment = {
  targetCaseFileId: number | string;
  severityRating?: number;
  severityReasons?: Array<string>;
  notes?: Array<string>;
  complianceRating?: number;
  complianceReasons?: Array<string>;
  completionRating?: number;
  completionReasons?: Array<string>;
  addRelatedDocuments?: Array<{
    relatedToDocumentId: number;
    relationshipType: string;
  }>;
  associateReponsiveAction?: Array<{
    responsiveDocumentId: number;
    complianceChapter13: number;
    comlianceChapter13Reasons: Array<string>;
    completionPercentage: number;
    completionReasons: Array<string>;
  }>;
  violations?: Array<typeof violationDetails.$inferInsert>;

  sentimentRating?: number;
  sentimentReasons?: Array<string>;
  chapter13Rating?: number;
  chapter13Reasons?: Array<string>;
  titleIXRating?: number;
  titleIXReasons?: Array<string>;
  explaination: string;
};

export type Amendment = {
  id: number | string;
  changes: Partial<CaseFileAmendment>;
};

export type AmendmentResult = {
  message: string;
  UpdatedRecords: Array<Amendment>;
  InsertedRecords: Array<Amendment>;
  FailedRecords: Array<
    Amendment & {
      error: string;
    }
  >;
};
