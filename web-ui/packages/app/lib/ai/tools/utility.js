import z from 'zod';
import { isError } from '@compliance-theater/logger';
import { isValidUuid as isValidUuidImpl, } from '@compliance-theater/typescript';
import { resolveCaseFileId as resolveCaseFileIdImpl, resolveCaseFileIdBatch as resolveCaseFileIdBatchImpl, } from '@/lib/api/document-unit/resolve-case-file-id';
import { deprecate } from '@/lib/nextjs-util';
export const toolCallbackResultFactory = (result, message) => {
    if (isError(result)) {
        return {
            content: [{ type: 'text', text: message ?? result.message }],
            structuredContent: {
                result: {
                    isError: true,
                    message: message ?? result.message,
                    cause: result.cause,
                },
            },
            isError: true,
        };
    }
    return Array.isArray(result)
        ? {
            content: [{ type: 'text', text: 'tool success' }],
            structuredContent: {
                result: {
                    isError: false,
                    items: result,
                },
            },
        }
        : {
            content: [{ type: 'text', text: 'tool success' }],
            structuredContent: {
                result: {
                    isError: false,
                    value: result,
                },
            },
        };
};
export const toolCallbackResultSchemaFactory = (resultSchema) => {
    const error = z.object({
        isError: z.literal(true),
        message: z.string().optional(),
        cause: z.any().optional(),
    });
    const success = z.object({
        isError: z.literal(false).optional(),
        value: resultSchema.optional(),
    });
    const result = z.discriminatedUnion('isError', [error, success]);
    return {
        result: result,
    };
};
export const toolCallbackArrayResultSchemaFactory = (resultSchema) => {
    const error = z.object({
        isError: z.literal(true),
        message: z.string().optional(),
        cause: z.any().optional(),
    });
    const success = z.object({
        isError: z.literal(false).optional(),
        items: z.array(resultSchema).optional(),
    });
    const result = z.discriminatedUnion('isError', [error, success]);
    return {
        result,
    };
};
export const isValidUuid = deprecate(isValidUuidImpl, 'isValidUuid is deprecated, import from @compliance-theater/typescript/guards', 'DEP0002');
export const resolveCaseFileId = deprecate(resolveCaseFileIdImpl, 'resolveCaseFileId is deprecated, import from @/lib/api/document-unit/resolve-case-file-id', 'DEP0003');
export const resolveCaseFileIdBatch = async (requests) => resolveCaseFileIdBatchImpl(requests, {
    getValue: (input) => input.caseFileId,
    setValue: (input, value) => ({
        ...input,
        caseFileId: value,
    }),
});
//# sourceMappingURL=utility.js.map