import { z } from 'zod';
import baseDocumentPropertyShape from './base-document-property-shape';

const KeyPoint = z.object({
  relevance: z.number().nullable().optional().describe('Relevance score'),
  compliance: z.number().nullable().optional().describe('Compliance score'),
  severityRanking: z.number().nullable().optional().describe('Severity ranking'),
  inferred: z.boolean().nullable().optional().describe('Was key point inferred'),
});

const docPropKeyPointShape = baseDocumentPropertyShape.extend({
  documentPropertyTypeId: z.literal(9).describe('Document property type ID for key point'),
  keyPoint: KeyPoint.describe('Key point details'),
});

export default docPropKeyPointShape;
