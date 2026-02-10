import { z } from 'zod';

const baseDocumentPropertyShape = z.object({
  documentPropertyTypeId: z
    .number()
    .describe('Property type ID (use with getDocumentPropertyType)'),
  createdOn: z
    .string()
    .optional()
    .nullable()
    .describe('ISO date when property was created'),
  policyBasis: z.array(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  doc: z
    .object({
      unitId: z.number(),
      emailId: z.string().optional().nullable(),
      attachmentId: z.number().optional().nullable(),
      documentPropertyId: z.string().optional().nullable(),
      documentType: z.union([
        z.literal('attachment'),
        z.literal('email'),
        z.literal('cta_response'),
        z.literal('key_point'),
        z.literal('note'),
        z.literal('compliance'),
        z.literal('cta'),
        z.literal('violation'),
        z.literal('note'),
      ]),
    })
    .optional()
    .nullable()
    .describe('Document this property originated from.'),
  docPropType: z
    .object({
      propertyName: z.union([
        z.literal('Compliance Score'),
        z.literal('Violation Details'),
        z.literal('Sentiment Analysis'),
        z.literal('Key Points'),
        z.literal('Manual Review Requested'),
        z.literal('Processing Note'),
        z.literal('Call to Action'),
        z.literal('Key Point'),
        z.literal('Call to Action Response'),
      ]),
    })
    .nullable()
    .optional()
    .describe('Document property type details'),
  propertyValue: z.string().optional().nullable(),
});

export default baseDocumentPropertyShape;
