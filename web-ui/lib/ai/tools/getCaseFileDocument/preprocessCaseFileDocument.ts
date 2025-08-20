import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { zodToStructure } from '@/lib/typescript';
import { CoreMessage, GenerateTextResult, ToolSet, wrapLanguageModel } from 'ai';
import { log } from '@/lib/logger';
import { aiModelFactory } from '../../aiModelFactory';
import { DocumentResource } from '../documentResource';
import { DocumentSchema } from '../schemas';
import { CaseFileResponse, SummarizedDocumentResource } from '../types';
import {
  caseFileDocumentPreprocessingCounter,
  caseFileDocumentPreprocessingDurationHistogram,
  caseFileDocumentSizeHistogram,
} from './metrics';
import { countTokens } from '../../core/count-tokens';
import { ChatHistoryContext, createChatHistoryMiddleware } from '../../middleware';
import { generateTextWithRetry } from '../../core/generate-text-with-retry';

/**
 * Preprocesses case file documents using AI to extract relevant information based on specified goals.
 *
 * @remarks
 * This function represents the core AI processing pipeline for document analysis and information extraction.
 * It uses sophisticated natural language processing to identify and extract information relevant to specific
 * compliance, policy, or analysis goals from legal and business documents.
 *
 * **AI Processing Pipeline:**
 * 1. **Input Preparation**: Serializes documents and metadata into structured JSON format
 * 2. **Token Estimation**: Calculates input size to select appropriate AI model (standard vs. high-capacity)
 * 3. **Prompt Engineering**: Uses specialized extraction prompt with goal-specific instructions
 * 4. **AI Analysis**: Processes documents through language model with low temperature for consistency
 * 5. **Result Extraction**: Parses structured output or falls back to text-based response
 * 6. **Metrics Recording**: Tracks performance, size, and error metrics for monitoring
 *
 * **Verbatim Fidelity Levels:**
 * - **100**: Exact quotes with full surrounding context preserved
 * - **75**: Exact excerpts with minimal necessary context (default for balanced quality)
 * - **50**: Summarized excerpts retaining key information with some context
 * - **1**: Full summarization where exact quotes are not required
 *
 * **Model Selection Logic:**
 * - Documents > 100,000 tokens: Uses high-capacity model (google:lofi) for complex analysis
 * - Smaller documents: Uses standard model (lofi) for cost-effectiveness
 *
 * **Output Structure:**
 * The AI generates structured responses containing:
 * - Document metadata (ID, type, creation date, sender)
 * - Related document references with relationship types
 * - Policy references and compliance tags
 * - Extracted passages with goal alignment and location metadata
 * - Compliance scores with rationale and applicability
 * - Identified omissions or gaps in expected information
 *
 * **Error Handling:**
 * - Comprehensive logging with document IDs and goals for debugging
 * - Graceful degradation to text output if structured parsing fails
 * - Detailed error metrics for system monitoring and alerting
 *
 * @param params - The preprocessing parameters
 * @param params.documents - Array of documents with verbatim fidelity settings, or single document
 * @param params.goals - Array of analysis goals to focus the extraction on (e.g., 'compliance-check', 'policy-violations')
 * @returns A promise that resolves to an array of CaseFileResponse objects with extracted information
 *
 * @throws {LoggedError} When AI processing fails, invalid input is provided, or system errors occur
 *
 * @example
 * ```typescript
 * // Single document analysis with specific goals
 * const results = await preprocessCaseFileDocument({
 *   documents: { document: docResource, verbatim_fidelity: 75 },
 *   goals: ['compliance-check', 'policy-violations']
 * });
 *
 * // Multiple documents with varying fidelity levels
 * const results = await preprocessCaseFileDocument({
 *   documents: [
 *     { document: emailDoc, verbatim_fidelity: 100 }, // High fidelity for legal email
 *     { document: attachmentDoc, verbatim_fidelity: 50 } // Lower fidelity for summary
 *   ],
 *   goals: ['security-audit', 'data-privacy-compliance']
 * });
 *
 * // Batch processing with shared goals
 * const results = await preprocessCaseFileDocument({
 *   documents: [
 *     { document: contract1, verbatim_fidelity: 80 },
 *     { document: contract2, verbatim_fidelity: 80 }
 *   ],
 *   goals: ['contract-compliance', 'financial-review']
 * });
 * ```
 */
export const preprocessCaseFileDocument = async ({
  documents,
  goals,
  chatHistoryContext,
}: {
  documents:
    | Array<{ verbatim_fidelity: number; document: DocumentResource }>
    | { verbatim_fidelity: number; document: DocumentResource };
  goals: Array<string>;
  chatHistoryContext: ChatHistoryContext;
}): Promise<Array<CaseFileResponse>> => {
  const preprocessingStartTime = Date.now();
  const source = Array.isArray(documents) ? documents : [documents];
  const recordContents = JSON.stringify(source, null, 2);
  const originalLength = recordContents.length;
  const { document_ids, document_types, fidelity } = source.reduce(
    (acc, doc) => {
      acc.document_ids.push(doc?.document?.unitId ?? 'missing');
      acc.document_types.push(doc?.document?.documentType ?? 'missing');
      acc.fidelity.push(doc?.verbatim_fidelity ?? 75);
      return acc;
    },
    {
      document_ids: [] as Array<number>,
      document_types: [] as Array<string>,
      fidelity: [] as Array<number>,
    },
  );

  const preprocessingAttributes = {
    document_ids,
    document_types,
    verbatim_fidelity: fidelity,
    original_size_bytes: originalLength,
    goals_count: goals.length,
  };

  /**
   * Specialized AI prompt for document information extraction and compliance analysis.
   *
   * This prompt is engineered to:
   * 1. **Establish Context**: Positions the AI as part of a multi-stage compliance system
   * 2. **Define Goals**: Clearly specifies the analysis objectives with visual emphasis
   * 3. **Control Fidelity**: Provides precise instructions for verbatim vs. summarized extraction
   * 4. **Structure Output**: Defines comprehensive JSON schema for consistent results
   * 5. **Handle Edge Cases**: Includes instructions for missing information and error states
   *
   * The prompt uses a structured approach that balances thorough analysis with practical
   * constraints like token limits and processing efficiency.
   */
  const PROMPT = `You are an information extraction pipeline in a multi-stage AI compliance system. Your task is to extract all information from a set of case file records that are directly relevant to the following goals:
  -  ${goals.map((goal) => `***${goal}***`).join('\n   - ')}.

Instructions:
  - The verbatim_fidelity level controls how closely output should match source text.
      100 = exact quotes with full context
      75 = exact excerpts with minimal context
      50 = summarized excerpts with some context
      1 = full summary, exact quotes not needed.
  - Keep extracted text brief and focused on the goals - one or two sentences per extracted passage max.
  - Always include:
    - Document ID, type, creation date, sender/originator. Line and character number the extraction begins.
    - If type is not email or attachment, include the ID of the email or attachment record associated with the document.
  - For each related relevant document, include its ID, type, and a brief snippet (first 1-2 sentences or most relevant passage).
  - All policy references, compliance tags, and any structured compliance annotations present in the record and relevant to goals.
  - For each extracted passage:
    - Include relevant excerpt, the goal(s) it addresses, and its location in the document.
      - Locations should include type of sub-record (email content, attachment, call to action, etc.) (e.g., paragraph, section, or key point / call to action / note) and the line+character offset the extraction begins.
    - If there is an explicit document id associated with the passage, include it as well.
    - List all compliance tags that apply to this passage and relevant to goals.
  - For each compliance tag, include any associated severity or sentiment scores, with:
    - The score value and type (e.g., severity, sentiment).
    - The rationale or explanation for the score (if available).
    - The specific passage, policy, or tag the score is evaluating.
  - If a compliance tag or score applies to multiple passages, make this mapping explicit.
  - Note any expected information that is missing (e.g., lack of acknowledgment of a complaint) in an "omissionsOrGaps" section.
  - If no relevant information is found, return a status field with the value 'no relevant information'.

Input Record Format:
[
{
  "verbatim_fidelity": ...,
  "document": ${zodToStructure(DocumentSchema)}  
}, ...]

Output Record Format: [
{
  "documentId": ...,
  "documentType": ...,
  "createdOn": ...,
  "sender": ...,
  "relatedDocuments": [
    { 
      documentId: ...,
      documentType: ...,
      relationshipType: ...,
      snippit: ...,
    }
  ],
  "policyReferences": [...],
  "complianceTags": [...],
  "extractedPassages": [
    {
      "text": "...",
      "goal": "...",
      "location": "...",
      "complianceTags": [...],
      "scores": [
        {
          "type": "...",
          "value": ...,
          "rationale": "...",
          "appliesTo": "..."
        }
      ]
    }
  ],
  "omissionsOrGaps": [...]
},
...]
 `;
  try {
    const payload = {
      // model,
      // prompt: PROMPT,      
      messages: [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: `The document record to analyze is as follows:
___BEGIN CASE FILE___
${recordContents}
___END CASE FILE___`,
        }
      ] as CoreMessage[],
      temperature: 0.1,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'completion-tool-case-file-preprocess',
        metadata: {
          documentId: document_ids.join(', '),
          goals: goals.join(', '),
        },
      },
    };

    const tokens = countTokens({ prompt: payload.messages });    
    let response: GenerateTextResult<ToolSet, unknown>;
    try
    {      
      const model = wrapLanguageModel({
        model:
          tokens > 100000
            ? aiModelFactory('google:gemini-2.0-flash')
            : aiModelFactory('lofi'),
        middleware: createChatHistoryMiddleware(chatHistoryContext),
      });
      response = await generateTextWithRetry({
        ...payload,
        model,
      });
    } catch(error) {
      chatHistoryContext.error = error;
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'getCaseFileDocument::preprocessCaseFileDocument',
      });
    } 
    
    const preprocessingDuration = Date.now() - preprocessingStartTime;

    // Record preprocessing success metrics
    caseFileDocumentPreprocessingCounter.add(1, {
      ...preprocessingAttributes,
      status: 'success',
    });

    caseFileDocumentPreprocessingDurationHistogram.record(
      preprocessingDuration,
      {
        ...preprocessingAttributes,
        status: 'success',
      },
    );

    // Record processed size metrics
    caseFileDocumentSizeHistogram.record(response.text.length, {
      ...preprocessingAttributes,
      operation_type: 'preprocessed_output',
    });

    log((l) =>
      l.info(
        `getCaseFileDocument::preprocessCaseFileDocument: Processed documents with ID ${document_ids.join(', ')} - original length: ${originalLength}, response length: ${response.text.length}`,
      ),
    );

    /**
     * Handle AI response parsing with graceful fallback strategy.
     *
     * **Response Processing Logic:**
     * 1. **Structured Output Priority**: Attempts to extract structured JSON from provider metadata
     * 2. **Array Normalization**: Ensures consistent array format for downstream processing
     * 3. **Fallback Handling**: Falls back to text-based response if structured parsing fails
     * 4. **Type Safety**: Applies appropriate type casting for SummarizedDocumentResource
     *
     * This approach provides resilience against variations in AI provider response formats
     * while maintaining type safety and consistent data structures for client consumption.
     */
    if (response.providerMetadata?.structuredOutputs) {
      // Handle structured outputs from AI provider
      return Array.isArray(response.providerMetadata.structuredOutputs)
        ? response.providerMetadata.structuredOutputs.map((x) => ({
            summary: x as SummarizedDocumentResource,
          }))
        : [
            {
              summary: response.providerMetadata
                .structuredOutputs as SummarizedDocumentResource,
            },
          ]; // Ensure we always return an array for consistent handling
    }

    // Fallback to text-based response when structured parsing isn't available
    return [{ text: response.text }];
  } catch (error) {
    const preprocessingDuration = Date.now() - preprocessingStartTime;

    // Record preprocessing error metrics
    caseFileDocumentPreprocessingCounter.add(1, {
      ...preprocessingAttributes,
      status: 'error',
    });

    caseFileDocumentPreprocessingDurationHistogram.record(
      preprocessingDuration,
      {
        ...preprocessingAttributes,
        status: 'error',
      },
    );

    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'getCaseFileDocument::preprocessCaseFileDocument',
      message: 'Error processing case file document',
      data: {
        documentId: document_ids.join(', '),
        goals: goals.join(', '),
      },
    });
  }
};
