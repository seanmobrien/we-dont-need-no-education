import { z } from 'zod';
import documentPropertyShape from './documentPropertyShape';

const referencedEmailShape = z.object({
  subject: z.string().describe('Subject of the email.'),
  doc: z
    .object({
      content: z
        .string()
        .describe('Content of the email.')
        .optional()
        .nullable(),
      createdOn: z
        .string()
        .describe('ISO-compliant date when the email was created.')
        .optional()
        .nullable(),
      unitId: z
        .number()
        .optional()
        .nullable()
        .describe(
          'Unique identifier for the document associated with the email.',
        ),
    })
    .describe('Details of the document associated with the email.'),
  sender: z
    .object({
      name: z.string().describe('Name of the sender.').optional().nullable(),
      isDistrictStaff: z
        .boolean()
        .optional()
        .nullable()
        .describe('Indicates if the sender is district staff.')
        .optional()
        .nullable(),
      email: z
        .string()
        .describe('Email address of the sender.')
        .optional()
        .nullable(),
      roleDscr: z
        .string()
        .describe('Role description of the sender.')
        .optional()
        .nullable(),
    })
    .describe('Details of the sender of the email.'),
  emailAttachments: z
    .array(
      z.object({
        fileName: z
          .string()
          .describe('Name of the attached file.')
          .optional()
          .nullable(),
        extractedText: z
          .string()
          .optional()
          .nullable()
          .describe('Extracted text content from the attachment.'),
        docs: z
          .array(
            z.object({
              unitId: z
                .number()
                .optional()
                .nullable()
                .describe(
                  'Unique identifier for the document associated with the attachment.',
                ),
              createdOn: z
                .string()
                .optional()
                .nullable()
                .describe('ISO-compliant date when the document was created.'),
            }),
          )
          .describe('Documents associated with the attachment.'),
      }),
    )
    .describe('Attachments associated with the email.'),
});

export const DocumentSchema = z.object({
  unitId: z
    .number()
    .optional()
    .nullable()
    .describe(
      'Unique identifier for this case file.  This value can be passed into `amendCaseFileDocument` and similar tools to refer to this record.',
    ),
  attachmentId: z
    .number()
    .nullable()
    .optional()
    .describe('Attachment ID associated with the document.'),
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
  emailId: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Email ID associated with the document.  While unitId / documentId is the preferred identifier, when documentType is `email` this value can be passed to tools to refer to this record.',
    ),
  content: z
    .string()
    .optional()
    .nullable()
    .describe('Content of the document.'),
  createdOn: z
    .string()
    .optional()
    .nullable()
    .describe(
      'A string containing an ISO-compliant Date value, identifying when the document was sent to the parent or created.',
    ),
  emailAttachment: z
    .object({
      // Not sending attachmentId here as it's available in the parent object
      // attachmentId: z.number().describe('Attachment ID.'),
      fileName: z.string().describe('Name of the file.'),
      size: z.number().describe('Size of the file in bytes.'),
      mimeType: z.string().describe('MIME type of the file.'),
    })
    .nullable()
    .optional()
    .describe(
      'Describes the attachment this case file specifically describes.',
    ),
  docProp: documentPropertyShape
    .nullable()
    .optional()
    .describe(
      'Details about the document property this case file specifically describes.',
    ),
  docProps: z
    .array(documentPropertyShape)
    .optional()
    .nullable()
    .describe(
      'An array of document properties associated with this case file.  This is distinct from `documentProperty`, which is the singular record specifically targeted with a case file.',
    ),
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
