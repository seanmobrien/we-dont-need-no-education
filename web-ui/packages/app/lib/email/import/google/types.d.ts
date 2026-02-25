/**
 * Type definitions for Google email import
 * @module @/lib/email/import/google/types
 */

import { gmail_v1 } from '@googleapis/gmail';
import { NextApiRequest } from 'next';
import { NextRequest } from 'next/server';

declare module '@/lib/email/import/google/types' {
/**
 * Props required for staging an email attachment.
 *
 * @property req - The incoming request object, which can be either a Next.js API request or a Next.js middleware request.
 * @property stagedMessageId - The identifier for the staged email message to which the attachment belongs.
 * @property part - The specific part of the Gmail message representing the attachment, following the Gmail API schema.
 */
export type StageAttachmentProps = {
  /**
   * The incoming request object, which can be either a Next.js API request or a Next.js middleware request.
   */
  req: NextRequest | NextApiRequest;
  /**
   * The identifier for the staged email message to which the attachment belongs.
   */
  stagedMessageId: string;
  /**
   * The specific part of the Gmail message representing the attachment, following the Gmail API schema.
   * This part contains details such as the part ID, filename, MIME type, and body size.
   * It is expected to conform to the `gmail_v1.Schema$MessagePart` type from the Gmail API.
   */
  part: gmail_v1.Schema$MessagePart;
};

/**
 * Represents the result of staging an email attachment.
 *
 * @property status - Indicates whether the staging was successful ('success') or encountered an error ('error').
 * @property error - Optional error message if the staging failed.
 * @property partId - The identifier for the email part associated with the attachment.
 */
export type AttachmentStagedResult = {
  /**
   * Indicates whether the staging was successful ('success') or encountered an error ('error').
   */
  status: 'success' | 'error';
  /**
   * Optional error message if the staging failed.
   */
  error?: string;
  /**
   * The identifier for the email part associated with the attachment.
   */
  partId: string;
};

}
