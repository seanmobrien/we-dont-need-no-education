import { z } from 'zod';
const CaseFileViolationShape = z.object({
    propertyId: z.string(),
    emailDocumentId: z.number(),
    violationType: z.string(),
    severityLevel: z.number(),
    severityReasons: z.array(z.string()),
    violationReasons: z.array(z.string()),
    titleIxRelevancy: z.number().describe('Title IX relevance rating'),
    chapt13Relevancy: z.number().describe('Chapter 13 relevance rating'),
    ferpaRelevancy: z.number().describe('FERPA relevance rating'),
    detectedBy: z.string().optional().describe('Who/what detected the violation'),
    detectedOn: z.string().optional().describe('When violation was detected'),
    otherRelevancy: z.unknown().optional().describe('Other compliance relevance'),
});
export default CaseFileViolationShape;
//# sourceMappingURL=caseFileViolationShape.js.map