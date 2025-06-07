import { z } from 'zod';

const CaseFileViolationShape = z.object({
  propertyId: z.string().describe('Property ID associated with the violation.'),
  emailDocumentId: z
    .number()
    .describe('ID of the email document where the violation occurred.'),
  violationType: z.string().describe('Type of the violation.'),
  severityLevel: z.number().describe('Severity level of the violation.'),
  severityReasons: z
    .array(z.string())
    .describe('Reasons for the severity level of the violation.'),
  violationReasons: z.array(z.string()).describe('Reasons for the violation.'),
  titleIxRelevancy: z
    .number()
    .describe('Relevancy of the violation to Title IX.'),
  chapt13Relevancy: z
    .number()
    .describe('Relevancy of the violation to Chapter 13.'),
  ferpaRelevancy: z.number().describe('Relevancy of the violation to FERPA.'),
  detectedBy: z
    .string()
    .optional()
    .describe('Entity or individual who detected the violation.'),
  detectedOn: z
    .string()
    .optional()
    .describe('Date when the violation was detected.'),
  otherRelevancy: z
    .unknown()
    .optional()
    .describe('Other relevancy information related to the violation.'),
});

export default CaseFileViolationShape;
