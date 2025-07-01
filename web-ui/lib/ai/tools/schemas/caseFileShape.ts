import { z } from 'zod';
import documentPropertyShape from './documentPropertyShape';

const referencedEmailShape = z.object({
  subject: z.string(),
  doc: z
    .object({
      content: z.string().optional().nullable(),
      createdOn: z.string().optional().nullable().describe('ISO date created'),
      unitId: z.number().optional().nullable().describe('Associated document unit ID'),
    })
    .describe('Email document details'),
  sender: z
    .object({
      name: z.string().optional().nullable(),
      isDistrictStaff: z.boolean().optional().nullable().describe('Is sender district staff'),
      email: z.string().optional().nullable(),
      roleDscr: z.string().optional().nullable().describe('Sender role description'),
    })
    .describe('Email sender details'),
  emailAttachments: z
    .array(
      z.object({
        fileName: z.string().optional().nullable(),
        extractedText: z.string().optional().nullable().describe('Text extracted from attachment'),
        docs: z
          .array(
            z.object({
              unitId: z.number().optional().nullable().describe('Associated document unit ID'),
              createdOn: z.string().optional().nullable().describe('ISO date created'),
            }),
          )
          .describe('Associated documents'),
      }),
    )
    .describe('Email attachments'),
});

export const DocumentSchema = z.object({
  unitId: z
    .number()
    .optional()
    .nullable()
    .describe('Case file ID (use with amendCaseFileDocument)'),
  attachmentId: z.number().nullable().optional(),
  documentPropertyId: z
    .string()
    .nullable()
    .optional()
    .describe('Alt document property ID for some tools'),
  documentType: z.string().optional().nullable()
    .describe('Document type: email, attachment, key_point, cta, cta_response'),
  emailId: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Email ID associated with the document.  While unitId / documentId is the preferred identifier, when documentType is `email` this value can be passed to tools to refer to this record.',
    ),
  content: z.string().optional().nullable(),
  createdOn: z
    .string()
    .optional()
    .nullable()
    .describe('ISO date when document was sent/created'),
  emailAttachment: z
    .object({
      fileName: z.string(),
      size: z.number().describe('File size in bytes'),
      mimeType: z.string(),
    })
    .nullable()
    .optional()
    .describe('Attachment details if this case file describes an attachment'),
  docProp: documentPropertyShape
    .nullable()
    .optional()
    .describe('Document property details for this case file'),
  docProps: z
    .array(documentPropertyShape)
    .optional()
    .nullable()
    .describe('Array of associated document properties'),
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
            .describe(
              'The role the contact holds (parent, superintendent, teacher, etc.).',
            ),
        })
        .nullable()
        .optional()
        .describe('Contact information of the person who sent the email.'),
      emailRecipients: z
        .array(
          z.object({
            recipient: z
              .object({
                name: z
                  .string()
                  .optional()
                  .nullable()
                  .describe('Name of the person who received the email.'),
                isDistrictStaff: z
                  .boolean()
                  .optional()
                  .nullable()
                  .describe('Indicates if the recipient is district staff.'),
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
  docRel_targetDoc: z.array(
    z
      .object({
        sourceDocumentId: z.number().describe('Source document ID.'),
        description: z
          .string()
          .optional()
          .nullable()
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
      })
      .describe(
        'Relationships to other documents, where this document is the target.',
      ),
  ),
  docRel_sourceDoc: z
    .array(
      z.object({
        targetDocumentId: z
          .number()
          .describe('Target document ID.')
          .optional()
          .nullable(),
        description: z
          .string()
          .optional()
          .nullable()
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
    )
    .describe(
      'Relationships to other documents, where this document is the source.',
    ),
});
