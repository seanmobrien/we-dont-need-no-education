import { z } from 'zod';
import CaseFileViolationShape from './caseFileViolationShape';

export const CaseFileAmendmentShape = z.object({
  targetCaseFileId: z
    .union([z.number(), z.string()])
    .describe('The ID of the case file to update.'),
  severityRating: z
    .number()
    .optional()
    .describe('Severity rating of the case file amendment.'),
  severityReasons: z
    .array(z.string())
    .optional()
    .describe('Reasons for the severity rating.'),
  notes: z
    .array(z.string())
    .optional()
    .describe('Notes associated with the case file amendment.'),
  complianceRating: z
    .number()
    .optional()
    .describe('Compliance rating of the case file amendment.'),
  complianceReasons: z
    .array(z.string())
    .optional()
    .describe('Reasons for the compliance rating.'),
  completionRating: z
    .number()
    .optional()
    .describe('Completion rating of the case file amendment.'),
  completionReasons: z
    .array(z.string())
    .optional()
    .describe('Reasons for the completion rating.'),
  addRelatedDocuments: z
    .array(
      z.object({
        relatedToDocumentId: z.number().describe('ID of the related document.'),
        relationshipType: z
          .string()
          .describe('Type of relationship to the related document.'),
      }),
    )
    .optional()
    .describe('Used to link two documents together.'),
  associateResponsiveAction: z
    .array(
      z.object({
        relatedCtaDocumentId: z
          .number()
          .describe('ID of the related CTA document.'),
        complianceChapter13: z
          .number()
          .describe('Compliance with Chapter 13 requirements.'),
        complianceChapter13Reasons: z
          .array(z.string())
          .describe('Reasons for compliance with Chapter 13.'),
        completionPercentage: z
          .number()
          .describe('Completion percentage of the responsive action.'),
        completionReasons: z
          .array(z.string())
          .describe('Reasons for the completion percentage.'),
      }),
    )
    .optional()
    .describe('Used to associate responsive actions with calls to action.'),
  violations: z
    .array(CaseFileViolationShape)
    .optional()
    .describe('An array of Violations to associate with the case file.'),
  sentimentRating: z
    .number()
    .optional()
    .describe(
      'New value to assign to the Sentiment rating of the case file.  If not set, the existing value will be retained.',
    ),
  sentimentReasons: z
    .array(z.string())
    .optional()
    .describe('Reasons for the sentiment rating.'),
  chapter13Rating: z
    .number()
    .optional()
    .describe(
      'New value to assign to the Chapter 13 rating of the case file.  If not set, the existing value will be retained.',
    ),
  chapter13Reasons: z
    .array(z.string())
    .optional()
    .describe(
      'A list of reasons describing key factors that went into the Chapter 13 rating.  Required if chapter13Rating is set.',
    ),
  titleIXRating: z
    .number()
    .optional()
    .describe(
      'The new value to assign to to the titleIXRating field of the associated.  If not set, the existing value will be retained.',
    ),
  titleIXReasons: z
    .array(z.string())
    .optional()
    .describe(
      'A list of reasons describing key factors that went into the titleIXRating.  Required if titleIXRating is set.',
    ),
  explaination: z
    .string()
    .describe(
      'A note explaining the updates being made and why they are necessary.  This is required for all amendments.',
    ),
});
