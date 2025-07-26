import z from 'zod';
import { SummarizedDocumentSchema } from './summarized-document-results';
import { DocumentSchema } from './caseFileShape';

/**
 * Schema for validating the properties required to request processing of a case file.
 *
 * @property caseFileId - The ID of the case file to process.
 * @property goals - (Optional) An array of goals identifying your task or describing what information should be extracted from the case files.
 *   When set, each document will be pre-processed and relevant information returned.
 *   When left blank, you will receive the full case files.
 *   Case file documents are large and require a lot of context space, so pre-processing is recommended.
 * @property verbatimFidelity - (Optional) Controls how closely output should match source text.
 *   100 = exact quotes with full context;
 *   75 = exact excerpts with minimal context;
 *   50 = summarized excerpts with some context;
 *   1 = full summary, exact quotes not needed.
 *   Set here to provide a default for all requests.
 */
export const caseFileRequestPropsShape = z.object({
  caseFileId: z.any().describe('The ID of the case file to process.'),
  goals: z
    .array(z.string())
    .describe(
      'An array of goals used to pre-process the results.  Values set here are specific to the case file and override the value passed at the request level.',
    )
    .optional(),
  verbatimFidelity: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Controls how closely output should match source text. Values set here are specific to the case file and override the value passed at the request level.',
    ),
});

/**
 * Schema for the response shape of a case file request.
 *
 * @property case_file - The full case file document, retuned if no summary is requested.
 * @property summary - The summarized document, returned if a summary is requested.
 * @property text - Raw content of the document, if structured output is not available.
 */
export const CaseFileResponseShape = z.object({
  case_file: DocumentSchema.extend({})
    .optional()
    .nullable()
    .describe(
      'The full case file document, returned if no goals were provided for pre-processing.',
    ),
  summary: SummarizedDocumentSchema.extend({})
    .optional()
    .nullable()
    .describe('The summarized document, returned when goals are provided to pre-process the result.'),
  text: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Raw content of the document - only returned when no pre-processing goals were provided but the file cannot be extracted as valid structured output.',
    ),
});
