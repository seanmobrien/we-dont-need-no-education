import { drizDb } from '@compliance-theater/database/orm';
import { LoggedError } from '@compliance-theater/logger';
import { toolCallbackArrayResultSchemaFactory, toolCallbackResultFactory, } from '../utility';
import { getCaseFileDocumentCounter, getCaseFileDocumentDurationHistogram, caseFileDocumentErrorCounter, } from './metrics';
import z from 'zod';
const mapDocumentType = (type) => {
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
            return type;
    }
};
const mapToDocumentType = (type) => {
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
export const getCaseFileDocumentIndex = async ({ scope: scopeFromProps, }) => {
    const startTime = Date.now();
    const attributes = {
        has_scope: Boolean(scopeFromProps?.length),
        scope_count: scopeFromProps?.length || 0,
    };
    try {
        const scope = (scopeFromProps ?? []).map((s) => mapToDocumentType(String(s)));
        const index = await drizDb()
            .query.documentUnits.findMany({
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
            .then((documents) => documents.map((doc) => ({
            ...doc,
            createdOn: new Date(doc.createdOn ?? Date.now()),
            documentType: mapDocumentType(doc.documentType ?? ''),
        })));
        const duration = Date.now() - startTime;
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
    }
    catch (error) {
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
        return toolCallbackResultFactory(LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            message: 'Error retrieving case file document index',
            data: { scope: scopeFromProps },
        }));
    }
};
export const getCaseFileDocumentIndexConfig = {
    description: 'Retrieves an index containing summary information about all case file documents, optionally filtered by document type.  This ' +
        'index can be used as a quick and reliable way to obtain a listing of document types for performing iterative retrievals or analysis.',
    inputSchema: {
        scope: z
            .array(z.enum([
            'email',
            'attachment',
            'core-document',
            'key-point',
            'call-to-action',
            'responsive-action',
            'note',
        ]))
            .optional()
            .describe(`An optional array of case file search scope types to filter the search results.  If not set, the search applies to all available scopes.  Available values are: 
  - 'email': represents email messages associated with the case file.
  - 'attachment': represents file attachments related to the case file.
  - 'core-document': an alias for 'email' and 'attachment', used to search across both scopes.
  - 'key-point': represents key points extracted from the case file.
  - 'call-to-action': represents actionable items identified in the case file.
  - 'responsive-action': represents responsive actions identified in the case file.
  - 'note': represents notes extracted from the case file.`),
    },
    outputSchema: toolCallbackArrayResultSchemaFactory(z.object({
        unitId: z
            .number()
            .describe('The unique identifier of the case file document.  This value can be passed to the `getCaseFileDocument` or `getMultipleCaseFileDocuments` tools to retrieve the full contents of the document.'),
        emailId: z
            .string()
            .nullable()
            .describe('The unique identifier of the email associated with the case file document, if applicable.'),
        attachmentId: z
            .number()
            .nullable()
            .describe('The unique identifier of the document property associated with the case file document, if applicable.'),
        documentType: z
            .string()
            .describe('The type of the case file document, such as email, attachment, key point, call to action, responsive action, or note.'),
        createdOn: z
            .date()
            .describe('The date and time when the case file document was created.'),
    })),
    annotations: {
        title: 'Retrieve Case File Document Index',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    },
};
//# sourceMappingURL=get-casefile-document-index.js.map