import { db } from '@/lib/drizzle-db/connection';
import { resolveCaseFileId, toolCallbackResultFactory } from './utility';
import {
  DocumentIndexResourceToolResult,
  DocumentResource,
  DocumentResourceIndex,
  DocumentResourceToolResult,
  MultipleDocumentResourceToolResult,
} from './types';
import { LoggedError } from '@/lib/react-util';
import { log } from '@/lib/logger';

import { caseFileDocumentShape } from './caseFileDocumentQuery';
import { aiModelFactory } from '../aiModelFactory';
import { generateText } from 'ai';
import { appMeters } from '@/lib/site-util/metrics';

// OpenTelemetry Metrics for GetCaseFileDocument Tool
const getCaseFileDocumentCounter = appMeters.createCounter(
  'ai_tool_get_case_file_document_total',
  {
    description: 'Total number of case file document retrieval operations',
    unit: '1',
  },
);

const getCaseFileDocumentDurationHistogram = appMeters.createHistogram(
  'ai_tool_get_case_file_document_duration_ms',
  {
    description: 'Duration of case file document retrieval operations',
    unit: 'ms',
  },
);

const caseFileDocumentSizeHistogram = appMeters.createHistogram(
  'ai_tool_case_file_document_size_bytes',
  {
    description: 'Size of retrieved case file documents in bytes',
    unit: 'bytes',
  },
);

const caseFileDocumentPreprocessingCounter = appMeters.createCounter(
  'ai_tool_case_file_preprocessing_total',
  {
    description: 'Total number of case file document preprocessing operations',
    unit: '1',
  },
);

const caseFileDocumentPreprocessingDurationHistogram =
  appMeters.createHistogram('ai_tool_case_file_preprocessing_duration_ms', {
    description: 'Duration of case file document preprocessing operations',
    unit: 'ms',
  });

const caseFileDocumentErrorCounter = appMeters.createCounter(
  'ai_tool_get_case_file_document_errors_total',
  {
    description: 'Total number of case file document retrieval errors',
    unit: '1',
  },
);

export const getCaseFileDocument = async (props: {
  caseFileId: number | string;
  goals?: Array<string>;
  reasoning?: number;
}): Promise<DocumentResourceToolResult> => {
  const startTime = Date.now();
  const { caseFileId, goals = [], reasoning = 0 } = props;

  const attributes = {
    has_goals: Boolean(goals.length),
    goals_count: goals.length,
    has_reasoning: Boolean(reasoning),
  };

  try {
    // If incoming documentId is a string, check to see if we were passed an email or property identifier.
    const parsedId = await resolveCaseFileId(caseFileId);
    if (!parsedId) {
      caseFileDocumentErrorCounter.add(1, {
        ...attributes,
        error_type: 'id_resolution_failed',
      });

      getCaseFileDocumentDurationHistogram.record(Date.now() - startTime, {
        ...attributes,
        status: 'error',
      });

      throw new Error(
        `Case File ID [${caseFileId}] could not be resolved to a valid document ID`,
      );
    }
    // If we made it this far we at least know we have a numeric documentId :)
    const document = await db.query.documentUnits.findFirst({
      where: (du, { eq }) => eq(du.unitId, parsedId),
      ...caseFileDocumentShape,
    });
    if (!document) {
      caseFileDocumentErrorCounter.add(1, {
        ...attributes,
        error_type: 'document_not_found',
      });

      getCaseFileDocumentDurationHistogram.record(Date.now() - startTime, {
        ...attributes,
        status: 'error',
      });

      throw new Error(
        `There is no document matching ID ${parsedId} - not found`,
      );
    }

    // Calculate document size for metrics
    const documentSize = JSON.stringify(document).length;
    caseFileDocumentSizeHistogram.record(documentSize, {
      ...attributes,
      document_type: document.documentType || 'unknown',
    });

    log((l) =>
      l.info(
        `getCaseFileDocument: Retrieved document with ID ${document.unitId}`,
      ),
    );

    let result: DocumentResource | string = document;

    if (goals?.length > 0) {
      result = await preprocessCaseFileDocument({ document, goals, reasoning });
    }

    const duration = Date.now() - startTime;

    // Record success metrics
    getCaseFileDocumentCounter.add(1, {
      ...attributes,
      document_type: document.documentType || 'unknown',
      status: 'success',
    });

    getCaseFileDocumentDurationHistogram.record(duration, {
      ...attributes,
      document_type: document.documentType || 'unknown',
      status: 'success',
    });

    return toolCallbackResultFactory<DocumentResource>(result);
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

    return toolCallbackResultFactory<DocumentResource>(
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
      }),
    );
  }
};

export const getMultipleCaseFileDocuments = async ({
  caseFileIds,
  goals = [],
  reasoning = 0,
}: {
  caseFileIds: (number | string)[];
  goals?: Array<string>;
  reasoning?: number;
}): Promise<MultipleDocumentResourceToolResult> => {
  const startTime = Date.now();

  const attributes = {
    has_goals: Boolean(goals.length),
    goals_count: goals.length,
    has_reasoning: Boolean(reasoning),
    document_count: caseFileIds.length,
  };

  try {
    const validIds = (await Promise.all(caseFileIds.map(resolveCaseFileId)))
      .filter(Boolean)
      .map((id) => Number(id)); // Ensure all IDs are numbers
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
        `No valid Case File IDs could be resolved from the provided identifiers: ${caseFileIds.join(', ')}`,
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

    let result: Array<DocumentResource> | Array<string> = documents;

    if (goals?.length > 0) {
      // Process each document if goals are specified
      result = await Promise.all(
        documents.map((document) =>
          preprocessCaseFileDocument({ document, goals, reasoning }),
        ),
      );
    }

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

    return toolCallbackResultFactory<Array<DocumentResource>>(result);
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

/**
 * Maps an external document scope value into it's serialized equivalent.
 * @param type
 * @returns
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

const preprocessCaseFileDocument = async ({
  document,
  goals,
  // reasoning,
}: {
  document: DocumentResource;
  goals: Array<string>;
  reasoning: number;
}): Promise<string | DocumentResource> => {
  const preprocessingStartTime = Date.now();
  const recordContents = JSON.stringify(document, null, 2);
  const originalLength = recordContents.length;

  const preprocessingAttributes = {
    document_id: document.unitId,
    document_type: document.documentType || 'unknown',
    original_size_bytes: originalLength,
    goals_count: goals.length,
  };

  const PROMPT = `You are an information extraction pipeline in a multi-stage AI compliance system. Your task is to extract all information from the case file JSON record that is directly relevant to the following goals:
   -  ${goals.map((goal) => `***${goal}***`).join('\n   - ')}.

Instructions:
  - Extract only exact text (no paraphrasing or summarizing) that directly addresses the goals.
  - Always include:
    - Document ID, type, creation date, sender/originator.
  - For each related document, include its ID, type, and a brief snippet (first 1-2 sentences or most relevant passage).
  - All policy references, compliance tags, and any structured compliance annotations present in the record.
  - For each extracted passage:
    - Include the exact text, the goal(s) it addresses, and its location in the document (e.g., paragraph, section, or key point / call to action / note).
    - If there is an explicit document id associated with the passage, include it as well.
    - List all compliance tags that apply to this passage.
  - For each compliance tag, include any associated severity or sentiment scores, with:
    - The score value and type (e.g., severity, sentiment).
    - The rationale or explanation for the score (if available).
    - The specific passage, policy, or tag the score is evaluating.
  - If a compliance tag or score applies to multiple passages, make this mapping explicit.
  - Note any expected information that is missing (e.g., lack of acknowledgment of a complaint) in an "omissionsOrGaps" section.
  - If no relevant information is found, return 'No relevant information found'.
  
Output Format:

{
  "documentId": ...,
  "documentType": ...,
  "createdOn": ...,
  "sender": ...,
  "relatedDocuments": [...],
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
}

The document record to analyze is as follows:
___BEGIN CASE FILE___
${recordContents}
___END CASE FILE___
 `;
  try {
    const model = aiModelFactory('lofi');
    const response = await generateText({
      model,
      prompt: PROMPT,
      temperature: 0.1,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'completion-tool-case-file-preprocess',
        metadata: {
          documentId: document.unitId,
          goals: goals.join(', '),
        },
      },
    });

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
        `getCaseFileDocument::preprocessCaseFileDocument: Processed document with ID ${document.unitId} - original length: ${originalLength}, response length: ${response.text.length}`,
      ),
    );
    return response.text;
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

    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'getCaseFileDocument::preprocessCaseFileDocument',
      message: 'Error processing case file document',
      data: { documentId: document.unitId },
    });
    return document;
  }
};
