import z from 'zod';

/**
 * Schema representing the summarized results of a case file document.
 *
 * @property documentId - Unique identifier for the document.
 * @property documentType - Type of document (e.g., email, attachment).
 * @property createdOn - Creation date and time of the document.
 * @property sender - Name and email of the document sender.
 * @property relatedDocuments - Array of related documents, each including:
 *   - documentId: Unique identifier for the related document.
 *   - relationshipType: Type of relationship (e.g., "supports", "responds to", "contradicts").
 *   - documentType: Type of the related document (call to action, note, email, etc).
 *   - excerpt: Short excerpt or summary of the related document.
 * @property policyReferences - Array of relevant policy references and statutes.
 * @property complianceTags - Array of compliance-related tags.
 * @property extractedPassages - Array of extracted passages with metadata, each including:
 *   - text: Extracted text passage.
 *   - goal: Goal this passage addresses.
 *   - location: Location in document (e.g., paragraph, line number).
 *   - complianceTags: Compliance tags specific to this passage.
 *   - scores: Array of scores associated with this passage, each including:
 *     - type: Type of score (e.g., severity, sentiment).
 *     - value: Numeric score value.
 *     - rationale: Explanation for the score.
 *     - appliesTo: What the score is evaluating.
 * @property omissionsOrGaps - Array of identified omissions or gaps in compliance.
 */
export const SummarizedDocumentSchema = z.object({
  documentId: z.string().or(z.number()).describe('Unique identifier for the document'),
  documentType: z
    .string()
    .describe('Type of document (e.g., email, attachment)'),
  createdOn: z.string().describe('Creation date and time of the document'),
  sender: z.string().nullable().describe('Name and email of the document sender'),
  relatedDocuments: z
    .array(
      z.object({
        documentId: z
          .string()
          .or(z.number())
          .describe('Unique identifier for the related document'),
        relationshipType: z
          .string()
          .describe(
            'Type of relationship (e.g., "supports", "responds to", "contradicts")',
          ),
        documentType: z
          .string()
          .describe(
            'Type of the related document (call to action, note, etc, email, etc)',
          ),
        excerpt: z
          .string()
          .optional()
          .nullable()
          .describe('Short excerpt or summary of the related document'),
      }).passthrough(),
    )
    .describe('Array of related document identifiers'),
  policyReferences: z
    .array(z.string())
    .describe('Array of relevant policy references and statutes'),
  complianceTags: z
    .array(z.string())
    .describe('Array of compliance-related tags'),
  extractedPassages: z
    .array(
      z.object({
        text: z.string().describe('Extracted text passage'),
        goal: z.string().describe('Goal this passage addresses'),
        location: z
          .string()
          .describe('Location in document (e.g., paragraph, line number)'),
        complianceTags: z
          .array(z.string())
          .describe('Compliance tags specific to this passage')
          .optional()
          .nullable(),
        scores: z
          .array(
            z.object({
              type: z
                .string()
                .describe('Type of score (e.g., severity, sentiment)'),
              value: z.number().describe('Numeric score value'),
              rationale: z.string().describe('Explanation for the score'),
              appliesTo: z.string().describe('What the score is evaluating'),
            }),
          )
          .describe('Array of scores associated with this passage'),
      }).passthrough(),
    )
    .optional()
    .describe('Array of extracted passages with metadata'),
  omissionsOrGaps: z
    .array(z.string())
    .describe('Array of identified omissions or gaps in compliance')
    .optional()
    .nullable(),
}).passthrough();
