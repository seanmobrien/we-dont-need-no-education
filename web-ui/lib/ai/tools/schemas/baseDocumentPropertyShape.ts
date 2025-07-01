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
  docPropType: z
    .object({
      propertyName: z.string(),
    })
    .nullable()
    .optional()
    .describe('Document property type details'),
  propertyValue: z.string().optional().nullable(),
});

export default baseDocumentPropertyShape;
