import { z } from 'zod';

export const HybridSearchOptionsSchema = z.object({
  hitsPerPage: z
    .number()
    .min(5)
    .max(100)
    .optional()
    .describe(
      'Number of results to return per page, between 5 and 100.  If not set, defaults to 15,',
    ),
  page: z
    .number()
    .min(1)
    .optional()
    .describe(
      'The page number to return, starting from 1.  If no value is set, the first page (1) is returned.',
    ),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'supports refining the search results by including arbitrary metadata values.  Prefer using filters with explicit keys when available.',
    ),
  count: z
    .boolean()
    .optional()
    .describe(
      'If true, the search will return the total number of results available for the query, in addition to the results themselves.  While this can be useful when looking ' +
        'to understand the scope of the search results, it will have an impact on performance and increase response times. Defaults to false.',
    ),
  continuationToken: z
    .string()
    .optional()
    .describe(
      'A token for pagination, allowing retrieval of the next set of results.  If set, the search will return the next set of results based on this token.  If not set, there are no additional results available beyond those returned in this response.' +
        'useful as an alternative to `hitsPerPage` and `page` for when the previous search timed out otherwise could not return a full resultset.',
    ),
  exhaustive: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true, triggers an exhaustive k-nearest neighbor search across all vectors within the vector index.  Useful for scenarios where exact matches are critical, such as determining ground truth values.  Default is false.',
    ),
});

export const PolicySearchOptionsSchema = HybridSearchOptionsSchema.extend({
  scope: z
    .array(z.enum(['school-district', 'state', 'federal']))
    .optional()
    .describe(
      `An optional array of policy search scope types to filter the search results.  If not set, the search applies to all available scopes.  Available value are:
  - 'school-district': represents policies specific to a school district.
  - 'state': represents policies and laws defined at the state level.
  - 'federal': represents policies and laws defined at the federal level.
`,
    ),
});

export const CaseFileSearchOptionsSchema = HybridSearchOptionsSchema.extend({
  scope: z
    .array(
      z.enum([
        'email',
        'attachment',
        'core-document',
        'key-point',
        'call-to-action',
        'responsive-action',
        'note',
      ]),
    )
    .optional()
    .describe(
      `An optional array of case file search scope types to filter the search results.  If not set, the search applies to all available scopes.  Available values are: 
  - 'email': represents email messages associated with the case file.
  - 'attachment': represents file attachments related to the case file.
  - 'core-document': an alias for 'email' and 'attachment', used to search across both scopes.
  - 'key-point': represents key points extracted from the case file.
  - 'call-to-action': represents actionable items identified in the case file.
  - 'responsive-action': represents responsive actions identified in the case file.
  - 'note': represents notes extracted from the case file.
`,
    ),
  emailId: z.string().optional().describe('The email id to filter results by.'),
  threadId: z
    .string()
    .optional()
    .describe('The thread id to filter results by.'),
  attachmentId: z
    .number()
    .optional()
    .describe('The attachment id to filter results by.'),
  documentId: z
    .number()
    .optional()
    .describe('The document id to filter results by.'),
  replyToDocumentId: z
    .number()
    .optional()
    .describe(
      'Filter by documents that are direct replies to this document id.',
    ),
  relatedToDocumentId: z
    .number()
    .optional()
    .describe('Filter by documents that are related to this document id.'),
});

export const AiSearchResultSchema = z.object({
  id: z
    .string()
    .optional()
    .describe('Unique identifier for this search result.'),
  content: z.string().describe('The main content of the search result.'),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'available metadata describing the search result, represented as key-value pairs.',
    ),
  score: z
    .number()
    .describe(
      'The relevance score of the search result, indicating how well it matches the search query after semantic re-ranking occurred.',
    ),
});

export const AiSearchResultEnvelopeSchema = z.object({
  results: z
    .array(AiSearchResultSchema)
    .describe('An array of AI search result items.'),
  total: z
    .number()
    .optional()
    .describe(
      'The total number of results available for the search query.  This is only returned when the `count` option on the search options is set to true.',
    ),
  continuationToken: z
    .string()
    .optional()
    .describe(
      'A token for pagination, allowing retrieval of the next set of results.  This is useful for retrieving exhaustive results when the resultset is large.  ' +
        'If not set, there are no additional results available beyond those returned in this response.  ' +
        'If set, the client can use this token to retrieve the next page of results by passing it in the `continuationToken` parameter of the next search request.',
    ),
});
export const DocumentSchema = z.object({
  unitId: z.number().describe('Unique identifier for the document unit.'),
  attachmentId: z
    .number()
    .nullable()
    .optional()
    .describe('Attachment ID associated with the document.'),
  documentPropertyId: z
    .string()
    .optional()
    .describe('Document property ID associated with the document.'),
  documentType: z
    .string()
    .describe('Type of the document (e.g., email, attachment).'),
  emailId: z
    .string()
    .optional()
    .describe('Email ID associated with the document.'),
  content: z.string().optional().describe('Content of the document.'),
  createdOn: z
    .string()
    .describe(
      'A string containing an ISO-compliant Date value, identifying when the document was sent to the parent or created.',
    ),
  emailAttachment: z
    .object({
      attachmentId: z.number().describe('Attachment ID.'),
      fileName: z.string().describe('Name of the file.'),
      size: z.number().describe('Size of the file in bytes.'),
      mimeType: z.string().describe('MIME type of the file.'),
    })
    .nullable()
    .optional(),
  documentProperty: z
    .object({
      documentPropertyTypeId: z.number().describe('Document property type ID.'),
      createdOn: z
        .string()
        .describe(
          'Contains an ISO-compliant date identifying the creation date of the record.',
        ),
      policyBasis: z
        .array(
          z
            .string()
            .describe('Policy basis of the document property.')
            .optional(),
        )
        .optional()
        .nullable(),
      tags: z
        .array(z.string())
        .optional()
        .nullable()
        .describe('Tags associated with the document property.'),
      emailPropertyType: z
        .object({
          documentPropertyTypeId: z
            .number()
            .describe('Email property type ID.'),
          propertyName: z.string().describe('Name of the property.'),
          emailPropertyCategory: z
            .object({
              emailPropertyCategoryId: z
                .number()
                .describe('Email property category ID.'),
              description: z
                .string()
                .describe('Description of the email property category.'),
            })
            .nullable()
            .optional(),
        })
        .nullable()
        .optional(),
      callToActionDetails: z
        .array(
          z.object({
            openedDate: z
              .string()
              .optional()
              .nullable()
              .describe(
                'ISO-compliant date when the call to action was opened.',
              ),
            closedDate: z
              .string()
              .optional()
              .nullable()
              .describe(
                'ISO-compliant date when the call to action was closed.',
              ),
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
                'Contains the percentage to which  the call to action is currently consider closed, represented from 0 to 1.',
              ),
            complianceRating: z
              .number()
              .optional()
              .nullable()
              .describe(
                'Compliance rating of the call to action, from 1 to -1.',
              ),
            complianceRatingReasons: z
              .array(z.string())
              .optional()
              .nullable()
              .describe('Reasons for the compliance rating.'),
            inferred: z
              .boolean()
              .optional()
              .nullable()
              .describe('Indicates if the compliance was inferred.'),
            complianceDateEnforceable: z
              .boolean()
              .optional()
              .nullable()
              .describe('Whether or not the compliance date is enforceable.'),
            reasonableReasons: z
              .array(z.string())
              .optional()
              .nullable()
              .describe('Reasons for reasonable requests.'),
            reasonableRequest: z
              .string()
              .optional()
              .nullable()
              .describe('Reasonable request description.'),
            sentiment: z
              .number()
              .optional()
              .nullable()
              .describe('Sentiment analysis result, from 1 to -1.'),
            sentimentReasons: z
              .array(z.string())
              .optional()
              .nullable()
              .describe('Reasons for sentiment analysis.'),
            severity: z
              .number()
              .optional()
              .describe('Severity level of the call to action, from 1 to 10.'),
            severityReason: z
              .array(z.string().optional().nullable())
              .describe('Reasons the severity level was assigned.'),
            titleIxApplicable: z
              .number()
              .optional()
              .nullable()
              .describe(
                'A rating as to how applicable to Title IX this record is.',
              ),
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
          }),
        )
        .nullable()
        .optional(),
      callToActionResponseDetails: z
        .array(z.object({}))
        .optional()
        .nullable()
        .describe('Details of responsive actions associated with this record.'),
    })
    .nullable()
    .optional(),
  email: z
    .object({
      contact: z
        .object({
          contactId: z.number().describe('Contact ID.'),
          name: z.string().describe('Name of the contact.'),
          isDistrictStaff: z
            .boolean()
            .describe('Indicates if the contact is district staff.'),
          email: z.string().describe('Email address of the contact.'),
          roleDscr: z.string().describe('Role description of the contact.'),
        })
        .nullable()
        .optional(),
      emailRecipients: z
        .array(
          z.object({
            contact: z
              .object({
                contactId: z.number().describe('Contact ID.'),
                name: z.string().describe('Name of the contact.'),
                isDistrictStaff: z
                  .boolean()
                  .describe('Indicates if the contact is district staff.'),
                email: z.string().describe('Email address of the contact.'),
                roleDscr: z
                  .string()
                  .describe('Role description of the contact.'),
              })
              .optional(),
          }),
        )
        .nullable()
        .optional(),
      emailAttachments: z
        .array(
          z.object({
            attachmentId: z.number().describe('Attachment ID.'),
            fileName: z.string().describe('Name of the file.'),
            size: z.number().describe('Size of the file in bytes.'),
            mimeType: z.string().describe('MIME type of the file.'),
            documentUnits: z
              .array(
                z.object({
                  unitId: z
                    .number()
                    .describe(
                      'Case file Id assigned to the attachment.  This value can be passed to getCaseFileDocument to retreive more information.',
                    ),
                }),
              )
              .nullable()
              .optional(),
          }),
        )
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});
