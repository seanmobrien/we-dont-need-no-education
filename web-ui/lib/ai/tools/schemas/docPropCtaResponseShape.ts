import { z } from 'zod';
import baseDocumentPropertyShape from './baseDocumentPropertyShape';

const CtaResponse = z.object({
  complianceRating: z
    .number()
    .nullable()
    .optional()
    .describe('Compliance rating of the response.'),
  complianceReasons: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Reasons for the compliance rating.'),
  severity: z
    .number()
    .nullable()
    .optional()
    .describe('Severity level of the response.'),
  severityReasons: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Reasons for the severity level.'),
  sentiment: z
    .number()
    .nullable()
    .optional()
    .describe('Sentiment analysis result for the response.'),
  sentimentReasons: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Reasons for sentiment analysis.'),
  ctas: z
    .array(
      z.object({
        completionPercentage: z
          .number()
          .nullable()
          .optional()
          .describe('Completion percentage for the CTA.'),
        completionPercentageReasons: z
          .array(z.string())
          .nullable()
          .optional()
          .describe('Reasons for the completion percentage.'),
        complianceChapter13: z
          .number()
          .nullable()
          .optional()
          .describe('Compliance with Chapter 13 requirements.'),
        complianceChapter13Reasons: z
          .array(z.string())
          .nullable()
          .optional()
          .describe('Reasons for compliance with Chapter 13.'),
        cta: z
          .object({
            openedDate: z
              .string()
              .nullable()
              .optional()
              .describe('ISO-compliant date when the CTA was opened.'),
            closedDate: z
              .string()
              .nullable()
              .optional()
              .describe('ISO-compliant date when the CTA was closed.'),
            compliancyCloseDate: z
              .string()
              .nullable()
              .optional()
              .describe('ISO-compliant date when compliance was closed.'),
            complianceRating: z
              .number()
              .nullable()
              .optional()
              .describe('Compliance rating of the CTA.'),
            complianceRatingReasons: z
              .array(z.string())
              .nullable()
              .optional()
              .describe('Reasons for the compliance rating.'),
            inferred: z
              .boolean()
              .nullable()
              .optional()
              .describe('Indicates if the compliance was inferred.'),
            complianceDateEnforceable: z
              .boolean()
              .nullable()
              .optional()
              .describe('Whether or not the compliance date is enforceable.'),
            sentiment: z
              .number()
              .nullable()
              .optional()
              .describe('Sentiment analysis result for the CTA.'),
            sentimentReasons: z
              .array(z.string())
              .nullable()
              .optional()
              .describe('Reasons for sentiment analysis.'),
            severity: z
              .number()
              .nullable()
              .optional()
              .describe('Severity level of the CTA.'),
            severityReason: z
              .array(z.string())
              .nullable()
              .optional()
              .describe('Reasons for the severity level.'),
            titleIxApplicable: z
              .number()
              .nullable()
              .optional()
              .describe(
                'Rating as to how applicable to Title IX this record is.',
              ),
            titleIxApplicableReasons: z
              .array(z.string())
              .nullable()
              .optional()
              .describe('Reasons for Title IX applicability.'),
            docProp: z
              .object({
                propertyValue: z
                  .string()
                  .nullable()
                  .optional()
                  .describe('Property value associated with the document.'),
                documentId: z
                  .number()
                  .nullable()
                  .optional()
                  .describe('Document ID associated with the property.'),
              })
              .nullable()
              .optional()
              .describe('Document property details associated with the CTA.'),
          })
          .nullable()
          .optional()
          .describe('Details of the call to action.'),
      }),
    )
    .nullable()
    .optional()
    .describe('CTAs associated with the response.'),
});

const docPropCtaResponseShape = baseDocumentPropertyShape.extend({
  documentPropertyTypeId: z
    .literal(5)
    .describe('Document property type ID for call to action response.'),
  response: CtaResponse.describe('Call to action response details.'),
});

export default docPropCtaResponseShape;
