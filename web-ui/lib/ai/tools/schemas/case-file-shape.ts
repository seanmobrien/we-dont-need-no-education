import { z } from 'zod';
import documentPropertyShape from './documentPropertyShape';
import { ArrayElement } from '/lib/typescript/_types';

const referencedEmailShape = z.object({
  subject: z.string(),
  doc: z
    .object({
      content: z.string().optional().nullable(),
      createdOn: z.string().optional().nullable(),
      unitId: z
        .number()
        .optional()
        .nullable()
        .describe('Case file for email record.'),
    })
    .describe('Email record metadata.'),
  sender: z.object({
    name: z.string().optional().nullable(),
    isDistrictStaff: z.boolean().optional().nullable(),
    email: z.string().optional().nullable(),
    roleDscr: z.string().describe('Senders Role').optional().nullable(),
  }),
  emailAttachments: z.array(
    z.object({
      fileName: z.string().optional().nullable(),
      extractedText: z
        .string()
        .optional()
        .nullable()
        .describe('Extracted attachment content'),
      docs: z
        .array(
          z.object({
            unitId: z
              .number()
              .optional()
              .nullable()
              .describe('Case File ID for a related record.'),
            createdOn: z.string().optional().nullable(),
          }),
        )
        .describe('Documents associated with the attachment.'),
    }),
  ),
});

export const DocumentSchema = z.object({
  unitId: z
    .number()
    .optional()
    .nullable()
    .describe('Identifies this case file.'),
  attachmentId: z.number().nullable().optional(),
  documentPropertyId: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Document property ID associated with the document.  While unitId / documentId is the preferred identifier, this value can be used to refer to this record in some tools.',
    ),
  documentType: z.string().optional().nullable()
    .describe(`Type of the document this case file describes.  Valid values include:
  - 'email': represents an email message.
  - 'attachment': represents a file attachment.
  - 'key_point': represents a key point extracted from the case file.
  - 'cta': Identifies a case file as specifically targeting an individual call to action.
  - 'cta_response': represents an action taken at least purportedly in response to a call to action.`),
  emailId: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  createdOn: z.string().optional().nullable(),
  emailAttachment: z
    .object({
      // Not sending attachmentId here as it's available in the parent object
      // attachmentId: z.number().describe('Attachment ID.'),
      fileName: z.string(),
      size: z.number(),
      mimeType: z.string(),
    })
    .nullable()
    .optional(),
  docProp: documentPropertyShape
    .nullable()
    .optional()
    .describe('Property case file metadata.'),
  docProps: z
    .array(documentPropertyShape)
    .optional()
    .nullable()
    .describe('Document Properties- related case file records.'),
  email: z
    .object({
      subject: z
        .string()
        .optional()
        .nullable()
        .describe('Subject of the email.'),
      threadId: z
        .number()
        .optional()
        .nullable()
        .describe('Thread ID of the email.'),
      sender: z
        .object({
          name: z
            .string()
            .describe('Name of the sender of the email.')
            .optional()
            .nullable(),
          isDistrictStaff: z
            .boolean()
            .optional()
            .nullable()
            .describe('Indicates if the sender is district staff.'),
          email: z
            .string()
            .describe('Email address of the sender.')
            .optional()
            .nullable(),
          roleDscr: z
            .string()
            .optional()
            .nullable()
            .describe('parent, superintendent, teacher, etc.'),
        })
        .nullable()
        .optional(),
      emailRecipients: z
        .array(
          z.object({
            recipient: z
              .object({
                name: z.string().optional().nullable(),
                isDistrictStaff: z.boolean().optional().nullable(),
                email: z
                  .string()
                  .describe('Email address of the recipient.')
                  .optional()
                  .nullable(),
                roleDscr: z
                  .string()
                  .optional()
                  .nullable()
                  .describe('Role description of the recipient.'),
              })
              .optional()
              .nullable(),
          }),
        )
        .nullable()
        .optional()
        .describe('Individual email addresses the communication was sent to.'),
      emailAttachments: z
        .array(
          z.object({
            fileName: z.string().describe('Name of the file.'),
            size: z.number().describe('Size of the file in bytes.'),
            mimeType: z.string().describe('MIME type of the file.'),
            expectedText: z
              .string()
              .optional()
              .nullable()
              .describe('Contents of the email.'),
            docs: z
              .array(
                z.object({
                  unitId: z
                    .number()
                    .optional()
                    .nullable()
                    .describe(
                      'Case file Id assigned to the attachment.  This value can be passed to getCaseFileDocument and similar tools to retreive attachment conntent and additional information.',
                    ),
                }),
              )
              .nullable()
              .optional(),
          }),
        )
        .nullable()
        .optional()
        .describe('Attachments associated with this email.'),
      inReplyTo: referencedEmailShape
        .optional()
        .nullable()
        .describe(
          'Details of the email this case file is a reply to, if applicable.',
        ),
      repliesTo: z
        .array(referencedEmailShape)
        .optional()
        .nullable()
        .describe(
          'Details of emails sent to this case file is a reply to, if applicable.',
        ),
    })
    .nullable()
    .optional()
    .describe('Details about the email this case file specifically describes.'),
  docRel_targetDoc: z
    .array(
      z.union([
        z.object({
          sourceDocumentId: z.number().describe('Source document ID.'),
          description: z
            .union([z.string(), z.array(z.string())])
            .describe(
              'Description of the relationship.  Some examples include "supports", "responds to", "contradicts", etc.',
            ),
          sourceDoc: z.object({
            documentType: z
              .string()
              .describe('Type of the source document.')
              .optional()
              .nullable(),
            content: z
              .string()
              .describe('Content of the source document.')
              .optional()
              .nullable(),
          }),
        }),
        z.object({
          description: z.union([z.string(), z.array(z.string())]),
          sourceDoc: z.object({
            unitId: z.number(),
            documentType: z
              .string()
              .describe('Type of the source document.')
              .optional()
              .nullable(),
            content: z.string().optional().nullable(),
          }),
        }),
      ]),
    )
    .nullable()
    .optional()
    .describe(
      'Relationships to other documents, where this document is the target.',
    ),
  docRel_sourceDoc: z
    .array(
      z.union([
        z.object({
          targetDocumentId: z.number().describe('Target document ID.'),
          description: z
            .union([z.string(), z.array(z.string())])
            .describe(
              'Description of the relationship.  Some examples include "supports", "responds to", "contradicts", etc.',
            ),
          targetDoc: z
            .object({
              documentType: z
                .string()
                .describe('Type of the source document.')
                .optional()
                .nullable(),
              content: z
                .string()
                .describe('Content of the source document.')
                .optional()
                .nullable(),
            })
            .optional()
            .nullable(),
        }),
        z.object({
          description: z
            .string()
            .or(z.array(z.string()))
            .optional()
            .nullable()
            .describe(
              'Description of the relationship.  Some examples include "supports", "responds to", "contradicts", etc.',
            ),
          targetDoc: z
            .object({
              unitId: z.number(),
              documentType: z
                .string()
                .describe('Type of the source document.')
                .optional()
                .nullable(),
              content: z
                .string()
                .describe('Content of the source document.')
                .optional()
                .nullable(),
            })
            .optional()
            .nullable(),
        }),
      ]),
    )
    .nullable()
    .optional()
    .describe(
      'Relationships to other documents, where this document is the source.',
    ),
});

export type DocumentSchemaType = typeof DocumentSchema._output;
export type TargetDocumentSchemaType = ArrayElement<
  DocumentSchemaType['docRel_targetDoc']
>;
export type SourceDocumentSchemaType = ArrayElement<
  DocumentSchemaType['docRel_sourceDoc']
>;
export type RelatedDocumentSchemaType =
  | SourceDocumentSchemaType
  | TargetDocumentSchemaType;
