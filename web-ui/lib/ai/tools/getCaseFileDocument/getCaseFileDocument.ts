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

import { db } from '@/lib/drizzle-db/connection';
import { resolveCaseFileIdBatch, toolCallbackResultFactory } from '../utility';
import {
  CaseFileRequestProps,
  CaseFileResponse,
  DocumentResource,
  ToolCallbackResult,
  ValidCaseFileRequestProps,
} from '../types';
import { LoggedError } from '@/lib/react-util';
import { log } from '@/lib/logger';
import { caseFileDocumentShape } from '../caseFileDocumentQuery';
import {
  caseFileDocumentErrorCounter,
  getCaseFileDocumentDurationHistogram,
  caseFileDocumentSizeHistogram,
  getCaseFileDocumentCounter,
} from './metrics';
import { preprocessCaseFileDocument } from './preprocessCaseFileDocument';

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
 *   case_file_id: 12345,
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
 *     { case_file_id: 123, goals: ['compliance-check'], verbatim_fidelity: 80 },
 *     { case_file_id: 456, goals: ['policy-review'], verbatim_fidelity: 60 }
 *   ]
 * });
 *
 * // Using global goals applied to all documents
 * const results = await getMultipleCaseFileDocuments({
 *   requests: [
 *     { case_file_id: 123 },
 *     { case_file_id: 456 }
 *   ],
 *   goals: ['security-audit', 'compliance-check'],
 *   verbatim_fidelity: 75
 * });
 *
 * // Documents with identical goals will be processed together for efficiency
 * const results = await getMultipleCaseFileDocuments({
 *   requests: [
 *     { case_file_id: 123, goals: ['policy-review', 'compliance'] },
 *     { case_file_id: 456, goals: ['compliance', 'policy-review'] }, // Same goals, different order
 *     { case_file_id: 789, goals: ['security-audit'] } // Different goals, separate processing
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
      verbatim_fidelity: x.verbatim_fidelity ?? verbatim_fidelity ?? 75,
      goals: [...new Set<string>([...(x.goals ?? []), ...globalGoals])],
    }),
  );

  const attributes = {
    // has_goals: Boolean(goals.length),
    // has_reasoning: Boolean(reasoning),
    // goals_count: goals.length,

    initial_document_count: requests.length,
    valid_document_count: resolvedRequests.length,
  };

  try {
    const validIds = resolvedRequests.map((x) => x.case_file_id);
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
        `No valid Case File IDs could be resolved from the provided identifiers: ${requests.map((r) => r.case_file_id).join(', ')}`,
      );
    }
    const documents = await db.query.documentUnits.findMany({
      where: (du, { inArray }) => inArray(du.unitId, validIds),
      ...caseFileDocumentShape,
    });

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

    // Join documents with resolvedRequests based on unitId = case_file_id
    // This creates a unified dataset where each document is paired with its analysis requirements
    const joinedData = documents.map((document) => {
      const matchingRequest = resolvedRequests.find(
        (req) => req.case_file_id === document.unitId,
      );
      return {
        document,
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
    const processedGroups = await Promise.all(
      Object.entries(groupedByGoals).map(async ([goalsKey, groupDocuments]) => {
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
        return await preprocessCaseFileDocument({
          documents: groupDocuments,
          goals: groupGoals,
        });
      }),
    );

    // Flatten the processed groups into a unified result array
    const result: CaseFileResponse[] = processedGroups.flat();

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
