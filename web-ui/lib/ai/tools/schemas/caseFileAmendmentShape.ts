import { z } from 'zod';
import CaseFileViolationShape from './caseFileViolationShape';

export const CaseFileAmendmentShape = z
  .object({
    targetCaseFileId: z
      .union([z.number(), z.string()])
      .describe('Identifies case file to amend.'),
    severityRating: z.number().optional(),
    severityReasons: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional(),
    complianceRating: z.number().optional(),
    complianceReasons: z.array(z.string()).optional(),
    completionRating: z
      .number()
      .optional()
      .describe('Rates how close to fully complete the CTA is.'),
    completionReasons: z.array(z.string()).optional(),
    addRelatedDocuments: z
      .array(
        z.object({
          relatedToDocumentId: z
            .number()
            .describe('Identifies related document.'),
          relationshipType: z
            .string()
            .describe('Describes how the document is related to case file.'),
        }),
      )
      .optional()
      .describe('Establishes relationships between case files.'),
    associateResponsiveAction: z
      .array(
        z.object({
          relatedCtaDocumentId: z
            .number()
            .describe('Identifies CTA case file.'),
          complianceChapter13: z.number(),
          complianceChapter13Reasons: z
            .array(z.string())
            .describe('Factors impacting complianceChapter13.'),
          completionPercentage: z.number(),
          completionReasons: z
            .array(z.string())
            .describe('Factors impacting completionPercentage.'),
        }),
      )
      .optional(),
    violations: z.array(CaseFileViolationShape).optional(),
    sentimentRating: z.number().optional(),
    sentimentReasons: z.array(z.string()).optional(),
    chapter13Rating: z.number().optional(),
    chapter13Reasons: z.array(z.string()).optional(),
    titleIXRating: z.number().optional(),
    titleIXReasons: z.array(z.string()).optional(),
    explanation: z
      .string()
      .describe('Reason amendment is being made - required.'),
  })
  .describe(
    'Describes the changes to make to a case file.  Properties that are not set will maintain current values.  When updating a Rating field the associated Reasons field must contain at least 3 values - eg changing the severityRating value necessitates passing 3 or more strings in the severityReasons property.',
  );
