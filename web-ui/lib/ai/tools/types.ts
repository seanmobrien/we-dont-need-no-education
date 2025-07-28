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

export type DocumentIndexResourceToolResult = ToolCallbackResult<
  Array<DocumentResourceIndex>
>;

/**
 * Represents a case file amendment request containing various compliance and rating updates.
 *
 * @property targetCaseFileId - The identifier of the case file to be amended (number or string)
 * @property severityRating - Optional numeric severity rating for the case
 * @property severityReasons - Optional array of reasons explaining the severity rating
 * @property notes - Optional array of additional notes or comments
 * @property complianceRating - Optional numeric compliance rating
 * @property complianceReasons - Optional array of reasons explaining the compliance rating
 * @property completionRating - Optional numeric completion rating
 * @property completionReasons - Optional array of reasons explaining the completion rating
 * @property addRelatedDocuments - Optional array of documents to link to this case file
 * @property associateResponsiveAction - Optional array of responsive actions to associate
 * @property violations - Optional array of violation details to add to the case file
 * @property sentimentRating - Optional numeric sentiment rating
 * @property sentimentReasons - Optional array of reasons explaining the sentiment rating
 * @property chapter13Rating - Optional numeric Chapter 13 compliance rating
 * @property chapter13Reasons - Optional array of reasons for Chapter 13 rating
 * @property titleIXRating - Optional numeric Title IX compliance rating
 * @property titleIXReasons - Optional array of reasons for Title IX rating
 * @property explanation - Required explanation of all changes and rationale
 */
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
  associateResponsiveAction?: Array<ResponsiveActionAssociation>;
  violations?: Array<typeof violationDetails.$inferInsert>;

  sentimentRating?: number;
  sentimentReasons?: Array<string>;
  chapter13Rating?: number;
  chapter13Reasons?: Array<string>;
  titleIXRating?: number;
  titleIXReasons?: Array<string>;
  explanation: string;
};

/**
 * Represents a single amendment with an identifier and changes to apply.
 *
 * @property id - Unique identifier for the amendment (number or string)
 * @property changes - Partial case file amendment changes to apply
 */
export type Amendment = {
  id: number | string;
  changes: Partial<CaseFileAmendment>;
};

/**
 * Represents the result of a batch amendment operation.
 *
 * @property message - Human-readable message describing the operation outcome
 * @property UpdatedRecords - Array of successfully updated amendment records
 * @property InsertedRecords - Array of successfully inserted new amendment records
 * @property FailedRecords - Array of amendment records that failed to process, including error details
 */
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

/**
 * Represents an association between a responsive action and a call-to-action document.
 *
 * @property relatedCtaDocumentId - The identifier of the related call-to-action document
 * @property complianceChapter13 - Numeric rating for Chapter 13 compliance
 * @property complianceChapter13Reasons - Array of reasons explaining the Chapter 13 compliance rating
 * @property completionPercentage - Percentage of completion for the responsive action
 * @property completionReasons - Array of reasons explaining the completion status
 */
export type ResponsiveActionAssociation = {
  relatedCtaDocumentId: number;
  complianceChapter13: number;
  complianceChapter13Reasons: Array<string>;
  completionPercentage: number;
  completionReasons: Array<string>;
};

/**
 * Represents the properties for a case file request.
 *
 * @property caseFileId - The case file identifier (can be any type, typically number or string)
 * @property goals - Optional array of goals or objectives for the case file analysis
 * @property verbatim_fidelity - Optional numeric value indicating the level of verbatim fidelity required (0-100)
 * @property max_response_tokens - maximum number of response tokens to return.  If not set, default of 1000 is used.
 */
export type CaseFileRequestProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  caseFileId?: any;
  goals?: Array<string>;
  verbatimFidelity?: number;
  max_response_tokens?: number;
};

/**
 * Represents validated case file request properties with guaranteed numeric caseFileId.
 *
 * @remarks
 * This type ensures that the caseFileId has been validated and converted to a number,
 * removing the ambiguity of the original CaseFileRequestProps type.
 *
 * @property caseFileId - The validated numeric case file identifier
 * @property goals - Optional array of goals or objectives for the case file analysis
 * @property verbatim_fidelity - Optional numeric value indicating the level of verbatim fidelity required (0-100)
 */
export type ValidCaseFileRequestProps = Omit<
  CaseFileRequestProps,
  'caseFileId'
> & {
  caseFileId: number; // Ensure caseFileId is always a number
};

/**
 * Represents a summarized document resource with extracted compliance information.
 *
 * @remarks
 * This type contains processed and analyzed document information, including extracted passages,
 * compliance tags, policy references, and scoring data. It's typically the result of AI-powered
 * document analysis and summarization processes.
 *
 * @property documentId - Unique identifier for the document
 * @property documentType - Type classification of the document (e.g., email, attachment, note)
 * @property createdOn - ISO timestamp string of when the document was created
 * @property sender - Name and contact information of the document sender/creator
 * @property relatedDocuments - Array of related documents with metadata
 * @property policyReferences - Array of relevant policy, statute, or regulation references
 * @property complianceTags - Array of compliance-related classification tags
 * @property extractedPassages - Array of key passages extracted from the document with analysis
 * @property omissionsOrGaps - Array of identified missing information or compliance gaps
 */
export type SummarizedDocumentResource = {
  documentId: string;
  documentType: string;
  createdOn: string;
  sender: string;
  relatedDocuments: Array<{
    documentId: string;
    relationshipType: string;
    documentType: string;
    excerpt: string;
  }>;
  policyReferences: Array<string>;
  complianceTags: Array<string>;
  extractedPassages: Array<{
    text: string;
    goal: string;
    location: string;
    complianceTags: Array<string>;
    scores: Array<{
      type: string;
      value: number;
      rationale: string;
      appliesTo: string;
    }>;
  }>;
  omissionsOrGaps: Array<string>;
};

/**
 * Represents a case file response containing both raw and summarized document data.
 *
 * @remarks
 * This type allows for flexible responses where either the full document resource,
 * a summarized version, both, or neither may be present depending on the request
 * parameters and processing results.
 *
 * @property case_file - Optional full document resource containing all raw document data
 * @property summary - Optional summarized document resource with extracted and analyzed content
 * @property text - Optional raw text content of the document, if structured output is not available
 */
export type CaseFileResponse = {
  case_file?: DocumentResource | null;
  summary?: SummarizedDocumentResource | null;
  text?: string;
};
