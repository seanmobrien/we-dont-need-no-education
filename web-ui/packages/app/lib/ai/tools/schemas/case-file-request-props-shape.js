import z from 'zod';
import { SummarizedDocumentSchema } from './summarized-document-results';
import { DocumentSchema } from './case-file-shape';
export const caseFileRequestPropsShape = z.object({
    caseFileId: z.any().describe('The ID of the case file to process.'),
    goals: z
        .array(z.string())
        .describe('An array of goals used to pre-process the results.  Values set here are specific to the case file and override the value passed at the request level.')
        .optional(),
    verbatimFidelity: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Controls how closely output should match source text. Values set here are specific to the case file and override the value passed at the request level.'),
});
export const CaseFileResponseShape = z.object({
    case_file: DocumentSchema.extend({})
        .optional()
        .nullable()
        .describe('The full case file document, returned if no goals were provided for pre-processing.'),
    summary: SummarizedDocumentSchema.extend({})
        .optional()
        .nullable()
        .describe('The summarized document, returned when goals are provided to pre-process the result.'),
    text: z
        .string()
        .optional()
        .nullable()
        .describe('Raw content of the document - only returned when no pre-processing goals were provided but the file cannot be extracted as valid structured output.'),
});
//# sourceMappingURL=case-file-request-props-shape.js.map