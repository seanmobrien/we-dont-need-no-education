import { z } from 'zod';

const baseDocumentPropertyShape = z.object({
  documentPropertyTypeId: z
    .number()
    .describe(
      'Unique identifier for the document property type.  This value can be passed to `getDocumentPropertyType` and similar tools to retrieve the full details of the document property type.',
    ),
  createdOn: z
    .string()
    .optional()
    .nullable()
    .describe(
      'A string containing an ISO-compliant Date value, identifying when the document property was created.',
    ),
  policyBasis: z
    .array(z.string())
    .optional()
    .nullable()
    .describe('Policy basis of the document property.'),
  tags: z
    .array(z.string())
    .optional()
    .nullable()
    .describe('Tags associated with the document property.'),
  docPropType: z
    .object({
      propertyName: z.string().describe('Name of the document property type.'),
    })
    .nullable()
    .optional()
    .describe('The type of document property this record describes'),
  propertyValue: z
    .string()
    .optional()
    .nullable()
    .describe('The value of the document property.'),
});

export default baseDocumentPropertyShape;
