import { z } from 'zod';
import CaseFileViolationShape from './caseFileViolationShape';

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
        relationshipType: z.string().describe('e.g. "supports", "responds to", "contradicts"'),
      }),
    )
    .optional()
    .describe('Link documents together'),
  associateResponsiveAction: z
    .array(
      z.object({
        relatedCtaDocumentId: z.number().describe('CTA document ID'),
        complianceChapter13: z.number().describe('Chapter 13 compliance rating'),
        complianceChapter13Reasons: z.array(z.string()).optional(),
        completionPercentage: z.number(),
        completionReasons: z.array(z.string()).optional(),
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
