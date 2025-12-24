/**
 * @fileoverview
 * This module defines TypeScript types for representing email attachments and their summaries.
 *
 * The `EmailAttachmentSummary` type provides a concise representation of an email attachment,
 * including essential metadata such as the attachment's unique identifier, file name, file path,
 * associated policy, email ID, MIME type, and size.
 *
 * The `EmailAttachment` type extends `EmailAttachmentSummary` to include additional details
 * extracted from the attachment, such as the extracted text, TSV (tab-separated values) representation,
 * and a brief summary of the content.
 *
 * These types are designed to facilitate the handling and processing of email attachments
 * in applications that require metadata and content extraction.
 */

/**
 * Represents a summary of an email attachment.
 *
 * @property attachmentId - The unique identifier for the attachment.
 * @property fileName - The name of the file attached to the email.
 * @property filePath - The file path where the attachment is stored.
 * @property policyId - The identifier of the policy associated with the attachment, or `null` if no policy is associated.
 * @property emailId - The unique identifier of the email to which the attachment belongs.
 * @property mimeType - The MIME type of the attachment, indicating the file format.
 * @property size - The size of the attachment in bytes.
 */
export type EmailAttachmentSummary = {
  /**
   * Unique identifier for the attachment.
   * @type {number}
   * @memberof EmailAttachmentSummary
   * @description The unique identifier for the attachment.
   * @example 12345
   */
  attachmentId: number;
  /**
   * Name of the file attached to the email.
   * @type {string}
   * @memberof EmailAttachmentSummary
   * @description The name of the file attached to the email.
   * @example "document.pdf"
   */
  fileName: string;
  /**
   * File path where the attachment is stored.
   * @type {string}
   * @memberof EmailAttachmentSummary
   * @description The file path where the attachment is stored.
   * @example "/attachments/document.pdf"
   */
  filePath: string;
  /**
   * Identifier of the policy associated with the attachment.
   * @type {number | null}
   * @memberof EmailAttachmentSummary
   * @description The identifier of the policy associated with the attachment, or `null` if no policy is associated.
   * @example 67890
   */
  policyId: number | null;
  /**
   * Unique identifier of the email to which the attachment belongs.
   * @type {string}
   * @memberof EmailAttachmentSummary
   * @description The unique identifier of the email to which the attachment belongs.
   * @example "abc123"
   */
  emailId: string;
  /**
   * MIME type of the attachment, indicating the file format.
   * @type {string}
   * @memberof EmailAttachmentSummary
   * @description The MIME type of the attachment, indicating the file format.
   * @example "application/pdf"
   */
  mimeType: string;
  /**
   * Size of the attachment in bytes.
   * @type {number}
   * @memberof EmailAttachmentSummary
   * @description The size of the attachment in bytes.
   * @example 2048
   */
  size: number;
};

/**
 * Represents an email attachment with additional extracted data.
 * Extends the `EmailAttachmentSummary` type to include detailed information
 * such as extracted text, TSV (tab-separated values) representation, and a summary.
 *
 * @property extractedText - The text content extracted from the attachment, or `null` if unavailable.
 * @property extractedTextTsv - The TSV (tab-separated values) representation of the extracted text, or `null` if unavailable.
 * @property summary - A brief summary of the attachment's content, or `null` if unavailable.
 */
export type EmailAttachment = EmailAttachmentSummary & {
  /**
   * Text content extracted from the attachment.
   * @type {string | null}
   * @memberof EmailAttachment
   * @description The text content extracted from the attachment, or `null` if unavailable.
   * @example "This is the extracted text."
   */
  extractedText: string | null;
  /**
   * TSV (tab-separated values) representation of the extracted text.
   * @type {string | null}
   * @memberof EmailAttachment
   * @description The TSV (tab-separated values) representation of the extracted text, or `null` if unavailable.
   * @example "column1\tcolumn2\tcolumn3"
   */
  extractedTextTsv: string | null;
  /**
   * A brief summary of the attachment's content.
   * @type {string | null}
   * @memberof EmailAttachment
   * @description A brief summary of the attachment's content, or `null` if unavailable.
   * @example "This attachment contains important information."
   */
  summary: string | null;
};
