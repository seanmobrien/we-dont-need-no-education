import { z } from 'zod';
import CaseFileViolationShape from './caseFileViolationShape';

/**
 * Schema for amending a case file, specifying updates to ratings, notes, related documents, responsive actions, and violations.
 *
 * @property targetCaseFileId - Case file ID to update (number or string).
 * @property severityRating - Optional severity rating.
 * @property severityReasons - Optional array of reasons for severity rating.
 * @property notes - Optional array of notes.
 * @property complianceRating - Optional compliance rating.
 * @property complianceReasons - Optional array of reasons for compliance rating.
 * @property completionRating - Optional completion rating.
 * @property completionReasons - Optional array of reasons for completion rating.
 * @property addRelatedDocuments - Optional array to link documents together, each specifying a related document ID and relationship type (e.g., "supports", "responds to", "contradicts").
 * @property associateResponsiveAction - Optional array to associate responsive actions with CTAs, including CTA document ID, Chapter 13 compliance rating and reasons, completion percentage, and completion reasons.
 * @property violations - Optional array of violations to associate with the case file.
 * @property sentimentRating - Optional new sentiment rating (retains existing if not set).
 * @property sentimentReasons - Optional array of reasons for sentiment rating.
 * @property chapter13Rating - Optional new Chapter 13 rating (retains existing if not set).
 * @property chapter13Reasons - Optional array of reasons for Chapter 13 rating (required if chapter13Rating is set).
 * @property titleIXRating - Optional new Title IX rating (retains existing if not set).
 * @property titleIXReasons - Optional array of reasons for Title IX rating (required if titleIXRating is set).
 * @property explaination - Required explanation of changes and rationale.
 */
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
