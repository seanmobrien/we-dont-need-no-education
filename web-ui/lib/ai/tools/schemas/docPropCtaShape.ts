import { z } from 'zod';
import baseDocumentPropertyShape from './baseDocumentPropertyShape';

const CtaSchema = z.object({
  openedDate: z
    .string()
    .optional()
    .nullable()
    .describe('ISO-compliant date when the call to action was opened.'),
  closedDate: z
    .string()
    .optional()
    .nullable()
    .describe('ISO-compliant date when the call to action was closed.'),
  compliancyCloseDate: z
    .string()
    .optional()
    .nullable()
    .describe('ISO-compliant date when compliance was closed.'),
  completionPercentage: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Percentage of completion for the call to action, represented as a string.',
    ),
  complianceRating: z
    .number()
    .optional()
    .nullable()
    .describe('Compliance rating of the call to action.'),
  complianceRatingReasons: z
    .array(z.string())
    .optional()
    .nullable()
    .describe('Reasons for the compliance rating.'),
  inferred: z.boolean().describe('Indicates if the compliance was inferred.'),
  complianceDateEnforceable: z
    .boolean()
    .optional()
    .describe('Whether or not the compliance date is enforceable.'),
  sentiment: z
    .number()
    .optional()
    .describe('Sentiment analysis result, from -1 to 1.'),
  sentimentReasons: z
    .array(z.string())
    .optional()
    .describe('Reasons for sentiment analysis.'),
  severity: z
    .number()
    .optional()
    .nullable()
    .describe('Severity level of the call to action, from 1 to 10.'),
  severityReason: z
    .array(z.string())
    .optional()
    .nullable()
    .describe('Reasons the severity level was assigned.'),
  titleIxApplicable: z
    .number()
    .optional()
    .nullable()
    .describe('Rating as to how applicable to Title IX this record is.'),
  titleIxApplicableReasons: z
    .array(z.string())
    .optional()
    .nullable()
    .describe('Reasons for Title IX applicability.'),
  closureActions: z
    .array(z.string())
    .optional()
    .nullable()
    .describe('Actions taken to close the call to action.'),
  cats: z
    .array(
      z.object({
        callToActionCategory: z.object({
          categoryName: z.string().describe('Name of the category.'),
        }),
      }),
    )
    .optional()
    .describe(
      'Additional categories or tags associated with the call to action.',
    ),
  responses: z
    .array(
      z.object({
        completionPercentage: z
          .string()
          .optional()
          .nullable()
          .describe('Completion percentage for the response.'),
        completionPercentageReasons: z
          .array(z.string())
          .optional()
          .nullable()
          .describe('Reasons for the completion percentage.'),
        complianceChapter13: z
          .number()
          .describe('Compliance with Chapter 13 requirements.'),
        complianceChapter13Reasons: z
          .array(z.string())
          .optional()
          .describe('Reasons for compliance with Chapter 13.'),
        ctaResponse: z
          .object({
            complianceRating: z
              .number()
              .optional()
              .nullable()
              .describe('Compliance rating for the response.'),
            complianceReasons: z
              .array(z.string())
              .optional()
              .nullable()
              .describe('Reasons for compliance.'),
            severity: z
              .number()
              .optional()
              .nullable()
              .describe('Severity level of the response.'),
            severityReasons: z
              .array(z.string())
              .optional()
              .nullable()
              .describe('Reasons for the severity level.'),
            sentiment: z
              .number()
              .optional()
              .nullable()
              .describe('Sentiment analysis result for the response.'),
            sentimentReasons: z
              .array(z.string())
              .optional()
              .nullable()
              .describe('Reasons for sentiment analysis.'),
            docProp: z
              .object({
                propertyValue: z
                  .string()
                  .optional()
                  .nullable()
                  .describe('Property value associated with the document.'),
                documentId: z
                  .number()
                  .optional()
                  .nullable()
                  .describe('Document ID associated with the property.'),
              })
              .describe(
                'Document property details associated with the associated response.',
              ),
          })
          .describe('Details of the responsive action matched to this call.'),
      }),
    )
    .describe('Responses associated with the call to action.'),
});

const docPropCtaShape = baseDocumentPropertyShape.extend({
  documentPropertyTypeId: z
    .literal(4)
    .describe('Document property type ID for call to action response.'),
  cta: CtaSchema.describe('Call to action property details.'),
});

export default docPropCtaShape;
