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

export const getCaseFileDocument = async (props: {
  caseFileId: number | string;
  goals?: Array<string>;
  reasoning?: number;
}): Promise<DocumentResourceToolResult> => {
  const { caseFileId, goals = [], reasoning = 0 } = props;
  try {
    // If incoming documentId is a string, check to see if we were passed an email or property identifier.
    const parsedId = await resolveCaseFileId(caseFileId);
    if (!parsedId) {
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
      throw new Error(
        `There is no document matching ID ${parsedId} - not found`,
      );
    }
    log((l) =>
      l.info(
        `getCaseFileDocument: Retrieved document with ID ${document.unitId}`,
      ),
    );

    if (goals?.length > 0) {
      return toolCallbackResultFactory<DocumentResource>(
        await preprocessCaseFileDocument({ document, goals, reasoning }),
      );
    }

    return toolCallbackResultFactory<DocumentResource>(document);
  } catch (error) {
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
  try {
    const validIds = (await Promise.all(caseFileIds.map(resolveCaseFileId)))
      .filter(Boolean)
      .map((id) => Number(id)); // Ensure all IDs are numbers
    if (validIds.length === 0) {
      throw new Error(
        `No valid Case File IDs could be resolved from the provided identifiers: ${caseFileIds.join(', ')}`,
      );
    }
    const documents = await db.query.documentUnits.findMany({
      where: (du, { inArray }) => inArray(du.unitId, validIds),
      ...caseFileDocumentShape,
    });
    log((l) =>
      l.info(
        `getMultipleCaseFileDocuments: Retrieved ${documents.length} documents`,
      ),
    );

    if (goals?.length > 0) {
      // Process each document if goals are specified
      const processedDocuments = await Promise.all(
        documents.map(document => 
          preprocessCaseFileDocument({ document, goals, reasoning })
        )
      );
      return toolCallbackResultFactory<Array<DocumentResource>>(processedDocuments);
    }

    return toolCallbackResultFactory<Array<DocumentResource>>(documents);
  } catch (error) {
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
    return toolCallbackResultFactory(index);
  } catch (error) {
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
  const recordContents = JSON.stringify(document, null, 2);
  const originalLength = recordContents.length;
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
    });
    log((l) =>
      l.info(
        `getCaseFileDocument::preprocessCaseFileDocument: Processed document with ID ${document.unitId} - original length: ${originalLength}, response length: ${response.text.length}`,
      ),
    );
    return response.text;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'getCaseFileDocument::preprocessCaseFileDocument',
      message: 'Error processing case file document',
      data: { documentId: document.unitId },
    });
    return document;
  }
};
