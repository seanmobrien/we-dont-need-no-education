import { z } from 'zod';
import baseDocumentPropertyShape from './baseDocumentPropertyShape';

const CtaSchema = z.object({
  openedDate: z.string().optional().nullable().describe('ISO date CTA opened'),
  closedDate: z.string().optional().nullable().describe('ISO date CTA closed'),
  compliancyCloseDate: z.string().optional().nullable().describe('ISO date compliance closed'),
  completionPercentage: z.string().optional().nullable().describe('Completion % as string'),
  complianceRating: z.number().optional().nullable(),
  complianceRatingReasons: z.array(z.string()).optional().nullable(),
  inferred: z.boolean().describe('Was compliance inferred'),
  complianceDateEnforceable: z.boolean().optional().describe('Is compliance date enforceable'),
  sentiment: z.number().optional().describe('Sentiment score (-1 to 1)'),
  sentimentReasons: z.array(z.string()).optional(),
  severity: z.number().optional().nullable().describe('Severity level (1-10)'),
  severityReason: z.array(z.string()).optional().nullable(),
  titleIxApplicable: z.number().optional().nullable().describe('Title IX applicability rating'),
  titleIxApplicableReasons: z.array(z.string()).optional().nullable(),
  closureActions: z.array(z.string()).optional().nullable(),
  cats: z
    .array(
      z.object({
        callToActionCategory: z.object({
          categoryName: z.string(),
        }),
      }),
    )
    .optional()
    .describe('CTA categories/tags'),
  responses: z
    .array(
      z.object({
        completionPercentage: z.string().optional().nullable().describe('Completion % as string'),
        completionPercentageReasons: z.array(z.string()).optional().nullable(),
        complianceChapter13: z.number().describe('Chapter 13 compliance rating'),
        complianceChapter13Reasons: z.array(z.string()).optional(),
        ctaResponse: z
          .object({
            complianceRating: z.number().optional().nullable(),
            complianceReasons: z.array(z.string()).optional().nullable(),
            severity: z.number().optional().nullable(),
            severityReasons: z.array(z.string()).optional().nullable(),
            sentiment: z.number().optional().nullable().describe('Sentiment score'),
            sentimentReasons: z.array(z.string()).optional().nullable(),
            docProp: z
              .object({
                propertyValue: z.string().optional().nullable(),
                documentId: z.number().optional().nullable(),
              })
              .describe('Associated document property'),
          })
          .describe('Responsive action details'),
      }),
    )
    .describe('CTA responses'),
});

const docPropCtaShape = baseDocumentPropertyShape.extend({
  documentPropertyTypeId: z.literal(4).describe('Document property type ID for CTA'),
  cta: CtaSchema.describe('Call to action details'),
});

export default docPropCtaShape;
