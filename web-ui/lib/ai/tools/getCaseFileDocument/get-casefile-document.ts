/**
 * @fileoverview Case File Document Retrieval and Processing System
 *
 * This module provides comprehensive functionality for retrieving, processing, and analyzing
 * case file documents using AI-powered information extraction. It serves as the core document
 * processing pipeline for compliance analysis, policy review, and legal document examination.
 *
 * **Key Features:**
 * - **Intelligent Document Retrieval**: Efficiently fetches case file documents with relationship data
 * - **Smart Grouping Algorithm**: Optimizes AI processing by batching documents with identical goals
 * - **AI-Powered Analysis**: Extracts relevant information using sophisticated language models
 * - **Flexible Verbatim Control**: Adjustable fidelity levels from exact quotes to summaries
 * - **Comprehensive Monitoring**: Full OpenTelemetry integration for operational insights
 * - **Error Resilience**: Robust error handling with detailed logging and graceful degradation
 *
 * **Main Functions:**
 * - `getCaseFileDocument`: Single document retrieval wrapper
 * - `getMultipleCaseFileDocuments`: Batch document processing with goal-based grouping
 * - `getCaseFileDocumentIndex`: Lightweight metadata retrieval for document discovery
 * - `preprocessCaseFileDocument`: AI-powered information extraction and analysis
 *
 * **Architecture:**
 * ```
 * Client Request → ID Resolution → Database Query → Document Grouping → AI Processing → Response
 *                     ↓              ↓             ↓                ↓            ↓
 *                 Validation    Relationship    Goal-based      Prompt         Structured
 *                              Loading         Batching        Engineering     Output
 * ```
 *
 * **Performance Characteristics:**
 * - Supports batch processing for efficiency
 * - Intelligent model selection based on content size
 * - Comprehensive metrics collection for monitoring
 * - Optimized database queries with selective field loading
 *
 * **Use Cases:**
 * - Legal compliance review and audit
 * - Policy violation detection and analysis
 * - Contract analysis and risk assessment
 * - Regulatory compliance monitoring
 * - Document summarization and information extraction
 *
 * @module getCaseFileDocument
 * @version 2.0.0
 * @author AI Tools Team
 * @since 1.0.0
 */

import { drizDbWithInit } from '@/lib/drizzle-db';
import {
  resolveCaseFileIdBatch,
  toolCallbackArrayResultSchemaFactory,
  toolCallbackResultFactory,
} from '../utility';
import {
  CaseFileRequestProps,
  CaseFileResponse,
  DocumentResource,
  ToolCallbackResult,
  ValidCaseFileRequestProps,
} from '../types';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { log } from '@/lib/logger';
import { caseFileDocumentShape } from '../case-file-document-query';
import {
  caseFileDocumentErrorCounter,
  getCaseFileDocumentDurationHistogram,
  caseFileDocumentSizeHistogram,
  getCaseFileDocumentCounter,
} from './metrics';
import { preprocessCaseFileDocument } from './preprocess-casefile-document';
import { countTokens } from '../../core/count-tokens';
import { generateChatId } from '../../core';
import {
  caseFileRequestPropsShape,
  CaseFileResponseShape,
} from '../schemas/case-file-request-props-shape';
import z from 'zod';
import { env } from '@/lib/site-util/env';
import { compactCaseFileDocument } from './compact-casefile-document';

/**
 * Retrieves a single case file document by delegating to getMultipleCaseFileDocuments.
 *
 * @remarks
 * This function serves as a convenience wrapper around getMultipleCaseFileDocuments
 * for single document retrieval. It handles the conversion from array response to
 * single document response.
 *
 * @param props - The case file request properties containing document ID, goals, and verbatim fidelity
 * @returns A promise that resolves to a ToolCallbackResult containing a single CaseFileResponse
 *
 * @example
 * ```typescript
 * const result = await getCaseFileDocument({
 *   caseFileId: 12345,
 *   goals: ['compliance-check', 'policy-review'],
 *   verbatim_fidelity: 75
 * });
 * ```
 */
export const getCaseFileDocument = async (
  props: CaseFileRequestProps,
): Promise<ToolCallbackResult<CaseFileResponse>> => {
  const result = await getMultipleCaseFileDocuments({
    requests: [props],
  });
  if (result.structuredContent.result.isError) {
    return result as ToolCallbackResult<CaseFileResponse>;
  }
  if (
    !result.structuredContent.result ||
    !result.structuredContent.result.items?.length
  ) {
    return result as ToolCallbackResult<CaseFileResponse>;
  }
  return toolCallbackResultFactory<CaseFileResponse>(
    result.structuredContent.result.items[0],
  );
};

/**
 * Retrieves multiple case file documents based on the provided requests, applying optional goals and verbatim fidelity.
 *
 * @remarks
 * This function implements a sophisticated document retrieval and grouping algorithm that optimizes
 * AI processing by batching documents with identical analysis goals. The grouping strategy reduces
 * redundant AI calls and ensures consistent analysis across documents with shared objectives.
 *
 * **Algorithm Overview:**
 * 1. **Request Resolution**: Converts case file identifiers to valid database IDs
 * 2. **Goal Merging**: Combines global and per-request goals, deduplicating automatically
 * 3. **Document Fetching**: Retrieves documents from database with full relationship data
 * 4. **Join Operation**: Associates each document with its request metadata (goals, fidelity)
 * 5. **Smart Grouping**: Groups documents by identical sorted goal arrays for batch processing
 * 6. **AI Processing**: Processes each group with shared goals through AI analysis pipeline
 * 7. **Result Flattening**: Returns a unified array of processed document responses
 *
 * **Performance Considerations:**
 * - Documents with identical goals are processed together to minimize AI calls
 * - Goal arrays are sorted before grouping to ensure consistent key generation
 * - Metrics are recorded for monitoring performance and error rates
 * - Large document sets may require chunking for optimal AI processing
 *
 * **Edge Cases Handled:**
 * - Invalid case file IDs are filtered out with proper error reporting
 * - Empty goal arrays result in unprocessed document passthrough
 * - Duplicate goals within a request are automatically deduplicated
 * - Missing verbatim fidelity defaults to 75% for balanced output quality
 *
 * @param params - The parameters for retrieving multiple case file documents.
 * @param params.requests - An array of case file request properties containing IDs, goals, and fidelity settings.
 * @param params.goals - (Optional) Global goals applied to all requests in addition to per-request goals.
 * @param params.verbatim_fidelity - (Optional) Default verbatim fidelity (1-100) when not specified per request.
 * @returns A promise that resolves to a `ToolCallbackResult` containing an array of `CaseFileResponse` objects.
 * @throws {Error} When no valid case file IDs can be resolved from the provided requests.
 *
 * @example
 * ```typescript
 * // Basic usage with multiple documents
 * const results = await getMultipleCaseFileDocuments({
 *   requests: [
 *     { caseFileId: 123, goals: ['compliance-check'], verbatim_fidelity: 80 },
 *     { caseFileId: 456, goals: ['policy-review'], verbatim_fidelity: 60 }
 *   ]
 * });
 *
 * // Using global goals applied to all documents
 * const results = await getMultipleCaseFileDocuments({
 *   requests: [
 *     { caseFileId: 123 },
 *     { caseFileId: 456 }
 *   ],
 *   goals: ['security-audit', 'compliance-check'],
 *   verbatimFidelity: 75
 * });
 *
 * // Documents with identical goals will be processed together for efficiency
 * const results = await getMultipleCaseFileDocuments({
 *   requests: [
 *     { caseFileId: 123, goals: ['policy-review', 'compliance'] },
 *     { caseFileId: 456, goals: ['compliance', 'policy-review'] }, // Same goals, different order
 *     { caseFileId: 789, goals: ['security-audit'] } // Different goals, separate processing
 *   ]
 * });
 * ```
 */
export const getMultipleCaseFileDocuments = async ({
  requests,
  verbatim_fidelity,
  goals = [],
}: {
  requests: Array<CaseFileRequestProps>;
  goals?: Array<string>;
  verbatim_fidelity?: number;
}): Promise<ToolCallbackResult<Array<CaseFileResponse>>> => {
  const startTime = Date.now();
  const globalGoals = goals ?? [];
  const resolvedRequests = (await resolveCaseFileIdBatch(requests)).map(
    (x: ValidCaseFileRequestProps) => ({
      ...x,
      verbatim_fidelity: x.verbatimFidelity ?? verbatim_fidelity ?? 75,
      goals: [...new Set<string>([...(x.goals ?? []), ...globalGoals])],
    }),
  );
  const attributes = {
    initial_document_count: requests.length,
    valid_document_count: resolvedRequests.length,
  };
  const requestId = generateChatId(JSON.stringify(resolvedRequests));
  try {
    const validIds = resolvedRequests.map((x) => x.caseFileId);
    if (validIds.length === 0) {
      caseFileDocumentErrorCounter.add(1, {
        ...attributes,
        error_type: 'no_valid_ids',
      });

      getCaseFileDocumentDurationHistogram.record(Date.now() - startTime, {
        ...attributes,
        status: 'error',
      });

      throw new Error(
        `No valid Case File IDs could be resolved from the provided identifiers: ${requests.map((r) => r.caseFileId).join(', ')}`,
      );
    }
    const documents = await drizDbWithInit((db) =>
      db.query.documentUnits.findMany({
        where: (du, { inArray }) => inArray(du.unitId, validIds),
        ...caseFileDocumentShape,
      }),
    );

    // Calculate total document size for metrics
    const totalDocumentSize = documents.reduce(
      (total, doc) => total + JSON.stringify(doc).length,
      0,
    );
    caseFileDocumentSizeHistogram.record(totalDocumentSize, {
      ...attributes,
      operation_type: 'multiple_documents',
    });

    log((l) =>
      l.info(
        `getMultipleCaseFileDocuments: Retrieved ${documents.length} documents`,
      ),
    );

    // Join documents with resolvedRequests based on unitId = caseFileId
    // This creates a unified dataset where each document is paired with its analysis requirements
    const joinedData = documents.map((document) => {
      const matchingRequest = resolvedRequests.find(
        (req) => req.caseFileId === document.unitId,
      );
      return {
        document: compactCaseFileDocument(document),
        verbatim_fidelity: matchingRequest?.verbatim_fidelity ?? 50,
        goals: matchingRequest?.goals ?? [],
      };
    });

    /**
     * Group documents by distinct arrays of goals for optimized batch processing.
     *
     * This grouping strategy serves multiple purposes:
     * 1. **Efficiency**: Documents with identical goals can be processed together in a single AI call
     * 2. **Consistency**: Ensures uniform analysis approach for documents with shared objectives
     * 3. **Cost Optimization**: Reduces the number of expensive AI API calls
     *
     * **Grouping Algorithm:**
     * - Goals arrays are sorted alphabetically to ensure consistent grouping regardless of input order
     * - JSON stringification of sorted arrays creates stable, unique group keys
     * - Empty goal arrays are handled separately to avoid unnecessary AI processing
     *
     * **Example Grouping:**
     * Input: [['policy', 'compliance'], ['compliance', 'policy'], ['security']]
     * Groups: {'["compliance","policy"]': [...], '["security"]': [...]}
     */
    const groupedByGoals = joinedData.reduce(
      (acc, item) => {
        // Sort the goals array to ensure consistent grouping regardless of order
        const sortedGoals = [...(item.goals || [])].sort();
        const goalsKey = JSON.stringify(sortedGoals);

        if (!acc[goalsKey]) {
          acc[goalsKey] = [];
        }
        acc[goalsKey].push({
          document: item.document,
          verbatim_fidelity: item.verbatim_fidelity,
        });
        return acc;
      },
      {} as Record<
        string,
        { document: DocumentResource; verbatim_fidelity: number }[]
      >,
    );

    /**
     * Process each group of documents with their shared goals using intelligent routing.
     *
     * **Processing Strategy:**
     * 1. **Empty Goals**: Documents without goals bypass AI processing for efficiency
     * 2. **Goal-Based Processing**: Documents with goals are analyzed using AI extraction
     * 3. **Parallel Execution**: Multiple groups are processed concurrently for performance
     * 4. **Result Consolidation**: All processed groups are flattened into a unified response
     *
     * This approach ensures that:
     * - Documents without specific analysis needs aren't subjected to unnecessary AI processing
     * - AI resources are used efficiently by processing similar documents together
     * - System performance scales well with varying document loads and complexity
     */
    let processedGroups: Array<CaseFileResponse | Array<CaseFileResponse>>;
    try {
      processedGroups = await Promise.all(
        Object.entries(groupedByGoals).map(
          async ([goalsKey, groupDocuments]) => {
            // Handle documents without goals - no AI processing needed
            if (goalsKey.trim() === '' || goalsKey === '[]') {
              return groupDocuments.map(
                (d) =>
                  ({
                    document: d.document as DocumentResource,
                  }) as CaseFileResponse,
              );
            }

            // Process documents with goals through AI analysis pipeline
            const groupGoals = JSON.parse(goalsKey) as string[];
            // New batching strategy: accumulate documents until token threshold exceeded, then process batch.
            // Threshold is configurable via env TOKEN_BATCH_THRESHOLD (defaults to 50,000 tokens).
            // Fallback in unlikely case env factory returns undefined (e.g., client context)
            const effectiveBatchThreshold =
              env('TOKEN_BATCH_THRESHOLD') || 50000;
            const aggregatedResults: Array<CaseFileResponse> = [];

            let currentBatch: typeof groupDocuments = [];
            let currentBatchTokens = 0;

            const processCurrentBatch = async () => {
              if (currentBatch.length === 0) return;
              try {
                const batchResults = await preprocessCaseFileDocument({
                  documents: currentBatch,
                  goals: groupGoals,
                  requestContext: { requestId: requestId.id },
                });
                aggregatedResults.push(...batchResults);
              } catch (error) {
                const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                  log: true,
                  source:
                    'getCaseFileDocument::preprocessCaseFileDocument:batch',
                });
                aggregatedResults.push(
                  ...(currentBatch.map((d) => ({
                    document: { unitId: d?.document?.unitId ?? '<<unknown>>' },
                    text: `An unexpected error occurred processing case file id ${d?.document?.unitId ?? '<<unknown>>'}. Please try your request again later.  Error details: ${le.toString()}`,
                  })) as Array<CaseFileResponse>),
                );
              } finally {
                currentBatch = [];
                currentBatchTokens = 0;
              }
            };

            for (const doc of groupDocuments) {
              let docTokens = 0;
              try {
                // Estimate tokens for this single document by serializing its content
                docTokens = countTokens({
                  // We approximate token usage by providing a single message with JSON of the document
                  prompt: [
                    { role: 'user', content: JSON.stringify(doc.document) },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ] as any,
                  enableLogging: false,
                });
              } catch {
                // Fallback conservative estimate if token counting fails
                docTokens = 2000;
              }

              // If adding this doc would exceed threshold, process existing batch first
              if (
                currentBatch.length > 0 &&
                currentBatchTokens + docTokens > effectiveBatchThreshold
              ) {
                await processCurrentBatch();
              }

              currentBatch.push(doc);
              currentBatchTokens += docTokens;

              // If a single (or accumulated) batch crosses threshold, process immediately
              if (currentBatchTokens > effectiveBatchThreshold) {
                await processCurrentBatch();
              }
            }

            // Process any remaining documents in the final batch
            await processCurrentBatch();

            return aggregatedResults;
          },
        ),
      );
    } finally {
      // Clean up any resources or contexts
    }

    // Flatten the processed groups into a unified result array
    const result: CaseFileResponse[] = processedGroups.flat().map((x) => {
      if (x && 'document' in x) {
        const { document: case_file, ...rest } = x;
        return {
          ...rest,
          case_file,
        };
      }
      return x as CaseFileResponse;
    });

    const duration = Date.now() - startTime;

    // Record success metrics
    getCaseFileDocumentCounter.add(1, {
      ...attributes,
      operation_type: 'multiple_documents',
      status: 'success',
      retrieved_count: documents.length,
    });

    getCaseFileDocumentDurationHistogram.record(duration, {
      ...attributes,
      operation_type: 'multiple_documents',
      status: 'success',
    });

    return toolCallbackResultFactory(result);
  } catch (error) {
    const duration = Date.now() - startTime;

    caseFileDocumentErrorCounter.add(1, {
      ...attributes,
      error_type: 'general_error',
    });

    getCaseFileDocumentDurationHistogram.record(duration, {
      ...attributes,
      status: 'error',
    });

    return toolCallbackResultFactory<Array<DocumentResource>>(
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
      }),
    );
  }
};

export const getMultipleCaseFileDocumentsConfig = {
  description:
    'Retrieves and pre-processes the full contents of a batch of specific case file documents by ID.  This will include all metadata, as well as any linked case file documents, such as ' +
    'extracted key points, notes, calls to action, responsive actions, or other relevant information.  Useful for performing detailed ' +
    'analysis of the case file contents.  IMPORTANT: case ' +
    'files are large and require a lot of context space, so pre-processing via goals is recommended. Never attempt to load more than 5 unprocessed documents at a time.  ' +
    'With adequate summarization goals, more documents can be processed, but you should never request more than 100 documents at once.',
  inputSchema: {
    requests: z
      .array(caseFileRequestPropsShape)
      .describe('An array of case file requests.'),
    goals: z
      .array(z.string())
      .describe(
        'An array of goals identifying your task or describing what information should be extracted from the case files.  When set, each document will be pre-processed and relevant information returned, when left blank you will receive the full case files.  Case file documents are large and require a lot of context space, so pre-processing is recommended.',
      )
      .optional(),
    verbatim_fidelity: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe(
        'Controls how closely output should match source text. 100 = exact quotes with full context;  75 = exact excerpts with minimal context; 50 = summarized excerpts with some context; 1 = full summary, exact quotes not needed.  Set here to provide a default for all requests.',
      ),
  },
  outputSchema: toolCallbackArrayResultSchemaFactory(
    z.string().or(CaseFileResponseShape),
  ),
  annotations: {
    title: 'Get Multiple Case Files',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

/*
  Single document tool - obsolete (not worth the toolspace, just load a multiple of 1)
server.registerTool(
  'getCaseFileDocument',
  {
    description:
      "Retrieves the full contents of a specific case file document by it's ID.  This will include all metadata, as well as any linked case file documents, such as " +
      'extracted key points, notes, calls to action, responsive actions, or other relevant information.  Useful for performing detailed ' +
      'analysis of the case file contents.  IMPORTANT: case files are large and require a lot of context space, so pre-processing via goals is recommended.',
    inputSchema: {
      ...caseFileRequestPropsShape.shape,
    },
    outputSchema: toolCallbackResultSchemaFactory(
      z.string().or(DocumentSchema),
    ),
    annotations: {
      title: 'Get Full Case File',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  getCaseFileDocument,
);
*/
