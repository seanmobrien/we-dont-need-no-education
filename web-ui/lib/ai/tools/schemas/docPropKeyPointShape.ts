import { z } from 'zod';
import baseDocumentPropertyShape from './baseDocumentPropertyShape';

const KeyPoint = z.object({
  relevance: z
    .number()
    .nullable()
    .optional()
    .describe('Relevance score of the key point.'),
  compliance: z
    .number()
    .nullable()
    .optional()
    .describe('Compliance score of the key point.'),
  severityRanking: z
    .number()
    .nullable()
    .optional()
    .describe('Severity ranking of the key point.'),
  inferred: z
    .boolean()
    .nullable()
    .optional()
    .describe('Indicates if the key point was inferred.'),
});

const docPropKeyPointShape = baseDocumentPropertyShape.extend({
  documentPropertyTypeId: z
    .literal(9)
    .describe('Document property type ID for call to action response.'),
  keyPoint: KeyPoint.describe('Call to action response details.'),
});

export default docPropKeyPointShape;
