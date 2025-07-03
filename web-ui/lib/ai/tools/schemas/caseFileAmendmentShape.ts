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
export const CaseFileAmendmentShape = z.object({
  targetCaseFileId: z
    .union([z.number(), z.string()])
    .describe('Case file ID to update'),
  severityRating: z.number().optional(),
  severityReasons: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
  complianceRating: z.number().optional(),
  complianceReasons: z.array(z.string()).optional(),
  completionRating: z.number().optional(),
  completionReasons: z.array(z.string()).optional(),
  addRelatedDocuments: z
    .array(
      z.object({
        relatedToDocumentId: z.number(),
        relationshipType: z
          .string()
          .describe('e.g. "supports", "responds to", "contradicts"'),
      }),
    )
    .optional()
    .describe('Link documents together'),
  associateResponsiveAction: z
    .array(
      z.object({
        relatedCtaDocumentId: z.number().describe('CTA document ID'),
        complianceChapter13: z
          .number()
          .describe('Chapter 13 compliance rating'),
        complianceChapter13Reasons: z.array(z.string()),
        completionPercentage: z.number(),
        completionReasons: z.array(z.string()),
      }),
    )
    .optional()
    .describe('Associate responsive actions with CTAs'),
  violations: z
    .array(CaseFileViolationShape)
    .optional()
    .describe('Violations to associate with case file'),
  sentimentRating: z
    .number()
    .optional()
    .describe('New sentiment rating (retains existing if not set)'),
  sentimentReasons: z.array(z.string()).optional(),
  chapter13Rating: z
    .number()
    .optional()
    .describe('New Chapter 13 rating (retains existing if not set)'),
  chapter13Reasons: z
    .array(z.string())
    .optional()
    .describe('Required if chapter13Rating is set'),
  titleIXRating: z
    .number()
    .optional()
    .describe('New Title IX rating (retains existing if not set)'),
  titleIXReasons: z
    .array(z.string())
    .optional()
    .describe('Required if titleIXRating is set'),
  explaination: z
    .string()
    .describe('Required explanation of changes and rationale'),
});
