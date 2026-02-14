import { drizDbWithInit } from '@compliance-theater/database/orm';
import { resolveCaseFileIdBatch, toolCallbackArrayResultSchemaFactory, toolCallbackResultFactory, } from '../utility';
import { LoggedError, log } from '@compliance-theater/logger';
import { caseFileDocumentShape } from '../case-file-document-query';
import { caseFileDocumentErrorCounter, getCaseFileDocumentDurationHistogram, caseFileDocumentSizeHistogram, getCaseFileDocumentCounter, } from './metrics';
import { preprocessCaseFileDocument } from './preprocess-casefile-document';
import { countTokens } from '../../core/count-tokens';
import { generateChatId } from '../../core';
import { caseFileRequestPropsShape, CaseFileResponseShape, } from '../schemas/case-file-request-props-shape';
import z from 'zod';
import { env } from '@compliance-theater/env';
import { compactCaseFileDocument } from './compact-casefile-document';
export const getCaseFileDocument = async (props) => {
    const result = await getMultipleCaseFileDocuments({
        requests: [props],
    });
    if (result.structuredContent.result.isError) {
        return result;
    }
    if (!result.structuredContent.result ||
        !result.structuredContent.result.items?.length) {
        return result;
    }
    return toolCallbackResultFactory(result.structuredContent.result.items[0]);
};
export const getMultipleCaseFileDocuments = async ({ requests, verbatim_fidelity, goals = [], }) => {
    const startTime = Date.now();
    const globalGoals = goals ?? [];
    const resolvedRequests = (await resolveCaseFileIdBatch(requests)).map((x) => ({
        ...x,
        verbatim_fidelity: x.verbatimFidelity ?? verbatim_fidelity ?? 75,
        goals: [...new Set([...(x.goals ?? []), ...globalGoals])],
    }));
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
            throw new Error(`No valid Case File IDs could be resolved from the provided identifiers: ${requests
                .map((r) => r.caseFileId)
                .join(', ')}`);
        }
        const documents = await drizDbWithInit((db) => db.query.documentUnits.findMany({
            where: (du, { inArray }) => inArray(du.unitId, validIds),
            ...caseFileDocumentShape,
        }));
        const totalDocumentSize = documents.reduce((total, doc) => total + JSON.stringify(doc).length, 0);
        caseFileDocumentSizeHistogram.record(totalDocumentSize, {
            ...attributes,
            operation_type: 'multiple_documents',
        });
        log((l) => l.info(`getMultipleCaseFileDocuments: Retrieved ${documents.length} documents`));
        const joinedData = documents.map((document) => {
            const matchingRequest = resolvedRequests.find((req) => req.caseFileId === document.unitId);
            return {
                document: compactCaseFileDocument(document),
                verbatim_fidelity: matchingRequest?.verbatim_fidelity ?? 50,
                goals: matchingRequest?.goals ?? [],
            };
        });
        const groupedByGoals = joinedData.reduce((acc, item) => {
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
        }, {});
        let processedGroups;
        try {
            processedGroups = await Promise.all(Object.entries(groupedByGoals).map(async ([goalsKey, groupDocuments]) => {
                if (goalsKey.trim() === '' || goalsKey === '[]') {
                    return groupDocuments.map((d) => ({
                        document: d.document,
                    }));
                }
                const groupGoals = JSON.parse(goalsKey);
                const effectiveBatchThreshold = env('TOKEN_BATCH_THRESHOLD') || 50000;
                const aggregatedResults = [];
                let currentBatch = [];
                let currentBatchTokens = 0;
                const processCurrentBatch = async () => {
                    if (currentBatch.length === 0)
                        return;
                    try {
                        const batchResults = await preprocessCaseFileDocument({
                            documents: currentBatch,
                            goals: groupGoals,
                            requestContext: { requestId: requestId.id },
                        });
                        aggregatedResults.push(...batchResults);
                    }
                    catch (error) {
                        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                            log: true,
                            source: 'getCaseFileDocument::preprocessCaseFileDocument:batch',
                        });
                        aggregatedResults.push(...currentBatch.map((d) => ({
                            document: { unitId: d?.document?.unitId ?? '<<unknown>>' },
                            text: `An unexpected error occurred processing case file id ${d?.document?.unitId ?? '<<unknown>>'}. Please try your request again later.  Error details: ${le.toString()}`,
                        })));
                    }
                    finally {
                        currentBatch = [];
                        currentBatchTokens = 0;
                    }
                };
                for (const doc of groupDocuments) {
                    let docTokens = 0;
                    try {
                        docTokens = countTokens({
                            prompt: [
                                { role: 'user', content: JSON.stringify(doc.document) },
                            ],
                            enableLogging: false,
                        });
                    }
                    catch {
                        docTokens = 2000;
                    }
                    if (currentBatch.length > 0 &&
                        currentBatchTokens + docTokens > effectiveBatchThreshold) {
                        await processCurrentBatch();
                    }
                    currentBatch.push(doc);
                    currentBatchTokens += docTokens;
                    if (currentBatchTokens > effectiveBatchThreshold) {
                        await processCurrentBatch();
                    }
                }
                await processCurrentBatch();
                return aggregatedResults;
            }));
        }
        finally {
        }
        const result = processedGroups.flat().map((x) => {
            if (x && 'document' in x) {
                const { document: case_file, ...rest } = x;
                return {
                    ...rest,
                    case_file,
                };
            }
            return x;
        });
        const duration = Date.now() - startTime;
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
    }
    catch (error) {
        const duration = Date.now() - startTime;
        caseFileDocumentErrorCounter.add(1, {
            ...attributes,
            error_type: 'general_error',
        });
        getCaseFileDocumentDurationHistogram.record(duration, {
            ...attributes,
            status: 'error',
        });
        return toolCallbackResultFactory(LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
        }));
    }
};
export const getMultipleCaseFileDocumentsConfig = {
    description: 'Retrieves and pre-processes the full contents of a batch of specific case file documents by ID.  This will include all metadata, as well as any linked case file documents, such as ' +
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
            .describe('An array of goals identifying your task or describing what information should be extracted from the case files.  When set, each document will be pre-processed and relevant information returned, when left blank you will receive the full case files.  Case file documents are large and require a lot of context space, so pre-processing is recommended.')
            .optional(),
        verbatim_fidelity: z
            .number()
            .min(1)
            .max(100)
            .optional()
            .describe('Controls how closely output should match source text. 100 = exact quotes with full context;  75 = exact excerpts with minimal context; 50 = summarized excerpts with some context; 1 = full summary, exact quotes not needed.  Set here to provide a default for all requests.'),
    },
    outputSchema: toolCallbackArrayResultSchemaFactory(z.string().or(CaseFileResponseShape)),
    annotations: {
        title: 'Get Multiple Case Files',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    },
};
//# sourceMappingURL=get-casefile-document.js.map