import { LoggedError, log } from '@compliance-theater/logger';
import { zodToStructure } from '@compliance-theater/typescript';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import { DocumentSchema } from '../schemas';
import { caseFileDocumentPreprocessingCounter, caseFileDocumentPreprocessingDurationHistogram, caseFileDocumentSizeHistogram, } from './metrics';
import { wrapChatHistoryMiddleware } from '@/lib/ai/middleware/chat-history';
import { generateTextWithRetry } from '@/lib/ai/core/generate-text-with-retry';
import { createAgentHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
export const preprocessCaseFileDocument = async ({ documents, goals, requestContext: { requestId }, }) => {
    const preprocessingStartTime = Date.now();
    const source = Array.isArray(documents) ? documents : [documents];
    const recordContents = JSON.stringify(source, null, 2);
    const originalLength = recordContents.length;
    const { document_ids, document_types, fidelity } = source.reduce((acc, doc) => {
        acc.document_ids.push(doc?.document?.unitId ?? 'missing');
        acc.document_types.push(doc?.document?.documentType ?? 'missing');
        acc.fidelity.push(doc?.verbatim_fidelity ?? 75);
        return acc;
    }, {
        document_ids: [],
        document_types: [],
        fidelity: [],
    });
    const preprocessingAttributes = {
        document_ids,
        document_types,
        verbatim_fidelity: fidelity,
        original_size_bytes: originalLength,
        goals_count: goals.length,
    };
    log((l) => l.info(`getCaseFileDocument::preprocessCaseFileDocument: Starting preprocessing for documents with ID ${document_ids.join(', ')} - original length: ${originalLength}`));
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
  "documentPropertyId": ...,
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
            prompt: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: PROMPT,
                        },
                        {
                            type: 'text',
                            text: `The document record to analyze is as follows:
___BEGIN CASE FILE___
${recordContents}
___END CASE FILE___`,
                        },
                    ],
                },
            ],
            experimental_telemetry: {
                isEnabled: true,
                functionId: 'completion-tool-case-file-preprocess',
                metadata: {
                    documentId: document_ids.join(', '),
                    goals: goals.join(', '),
                    requestId: requestId,
                },
            },
        };
        let response;
        const chatHistoryContext = createAgentHistoryContext({
            operation: 'summarize.case-file',
            iteration: 1,
            originatingUserId: '-1',
            metadata: {
                requestId,
                documentId: document_ids.join(', '),
                goals: goals.join(', '),
            },
        });
        try {
            const model = wrapChatHistoryMiddleware({
                model: await aiModelFactory('lofi'),
                chatHistoryContext,
            });
            response = await generateTextWithRetry({
                ...payload,
                model,
            });
        }
        catch (error) {
            chatHistoryContext.error = error;
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'getCaseFileDocument::preprocessCaseFileDocument',
            });
        }
        finally {
            chatHistoryContext?.dispose();
        }
        const preprocessingDuration = Date.now() - preprocessingStartTime;
        caseFileDocumentPreprocessingCounter.add(1, {
            ...preprocessingAttributes,
            status: 'success',
        });
        caseFileDocumentPreprocessingDurationHistogram.record(preprocessingDuration, {
            ...preprocessingAttributes,
            status: 'success',
        });
        caseFileDocumentSizeHistogram.record(response.text.length, {
            ...preprocessingAttributes,
            operation_type: 'preprocessed_output',
        });
        log((l) => l.info(`getCaseFileDocument::preprocessCaseFileDocument: Processed documents with ID ${document_ids.join(', ')} - original length: ${originalLength}, response length: ${response.text.length}`));
        if (response.providerMetadata?.structuredOutputs) {
            return Array.isArray(response.providerMetadata.structuredOutputs)
                ? response.providerMetadata.structuredOutputs.map((x) => ({
                    summary: x,
                }))
                : [
                    {
                        summary: response.providerMetadata
                            .structuredOutputs,
                    },
                ];
        }
        return [{ text: response.text }];
    }
    catch (error) {
        const preprocessingDuration = Date.now() - preprocessingStartTime;
        caseFileDocumentPreprocessingCounter.add(1, {
            ...preprocessingAttributes,
            status: 'error',
        });
        caseFileDocumentPreprocessingDurationHistogram.record(preprocessingDuration, {
            ...preprocessingAttributes,
            status: 'error',
        });
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
//# sourceMappingURL=preprocess-casefile-document.js.map