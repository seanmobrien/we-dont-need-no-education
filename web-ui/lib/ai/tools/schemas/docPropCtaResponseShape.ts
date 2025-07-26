import { z } from 'zod';
import baseDocumentPropertyShape from './baseDocumentPropertyShape';

const CtaResponse = z.object({
  complianceRating: z.number().nullable().optional(),
  complianceReasons: z.array(z.string()).nullable().optional(),
  severity: z.number().nullable().optional(),
  severityReasons: z.array(z.string()).nullable().optional(),
  sentiment: z.number().nullable().optional().describe('Sentiment score'),
  sentimentReasons: z.array(z.string()).nullable().optional(),
  ctas: z
    .array(
      z.object({
        completionPercentage: z.number().nullable().optional().describe('Completion %'),
        completionPercentageReasons: z.array(z.string()).nullable().optional(),
        complianceChapter13: z.number().nullable().optional().describe('Chapter 13 compliance'),
        complianceChapter13Reasons: z.array(z.string()).nullable().optional(),
        cta: z
          .object({
            openedDate: z.string().nullable().optional().describe('ISO date opened'),
            closedDate: z.string().nullable().optional().describe('ISO date closed'),
            compliancyCloseDate: z.string().nullable().optional().describe('ISO compliance close date'),
            complianceRating: z.number().nullable().optional(),
            complianceRatingReasons: z.array(z.string()).nullable().optional(),
            inferred: z.boolean().nullable().optional().describe('Was compliance inferred'),
            complianceDateEnforceable: z.boolean().nullable().optional().describe('Is compliance date enforceable'),
            sentiment: z.number().nullable().optional().describe('CTA sentiment score'),
            sentimentReasons: z.array(z.string()).nullable().optional(),
            severity: z.number().nullable().optional(),
            severityReason: z.array(z.string()).nullable().optional(),
            titleIxApplicable: z.number().nullable().optional().describe('Title IX applicability rating'),
            titleIxApplicableReasons: z.array(z.string()).nullable().optional(),
            docProp: z
              .object({
                propertyValue: z.string().nullable().optional(),
                documentId: z.number().nullable().optional(),
              })
              .nullable()
              .optional()
              .describe('Associated document property'),
          })
          .nullable()
          .optional()
          .describe('CTA details'),
      }),
    )
    .nullable()
    .optional()
    .describe('Associated CTAs'),
});

const docPropCtaResponseShape = baseDocumentPropertyShape.extend({
  documentPropertyTypeId: z.literal(5).describe('Document property type ID for CTA response'),
  response: CtaResponse.describe('CTA response details'),
});

export default docPropCtaResponseShape;
