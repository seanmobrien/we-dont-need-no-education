import { ContactSummary } from '../contact';
import type { GmailEmailImportSource } from './provider-google';

export type { GmailEmailImportSource };

export const ImportStageValues = [
  'new',
  'staged',
  'contacts',
  'body',
  'headers',
  'attachments',
  'completed',
] as const;
export type ImportStage = (typeof ImportStageValues)[number];

/**
 * Represents an email message to be imported from a source.
 *
 * @property {string} [id] - Once availalble, this contains the id of the matching email_staging record.
 * @property {string} [targetId] - Once available this contains the id of the emails record.
 * @property {GmailEmailImportSource} raw - The raw email data from the Gmail import source.
 * @property {ImportStage} stage - The current stage of the import process.
 */
export type ImportSourceMessage = {
  /**
   * The unique identifier of the staged_message record.
   */
  id?: string;
  /**
   * The unique identifier of the target emails table record.
   */
  targetId?: string;
  /**
   * The unique identifier used by the provider to identify the email.
   */
  providerId: string;
  /**
   * The raw email data from the Gmail import source.
   */
  raw: GmailEmailImportSource;
  /**
   * The current stage of the import process.
   */
  stage: ImportStage;
  /**
   * The user id of the user who owns the email.
   */
  userId: number;
};

/**
 * Represents a summary of a staged email message in the import process.
 *
 * @type {Object} StagedMessageSummary
 *
 * @property {string} id - The unique identifier of the staged_message record.
 * @property {ImportStage} stage - The current stage of the import process for the message.
 * @property {string} [targetId] - Once available, the unique id of the target emails table record.
 * @property {Date} timestamp - The timestamp when the message was staged.
 * @property {string} sender - The email address of the sender of the message.
 * @property {Array<string> | string | null} recipients - The recipients of the message, which can be an array of email addresses, a single email address, or null.
 */
export type StagedMessageSummary = {
  id: string;
  stage: ImportStage;
  targetId?: string;
  timestamp: Date;
  sender: string;
  userId: number;
  recipients: Array<string> | string | null;
};

export type EmailSearchResult = {
  id: string;
  threadId?: string;
};

/**
 * Represents a summary of email properties.
 *
 * @property {string} typeId - The type identifier of the email property.
 * @property {string} propertyId - The unique identifier of the property.
 * @property {string} emailId - The unique identifier of the email.
 * @property {Date} createdOn - The date when the email property was created.
 */
export type EmailPropertySummary = {
  typeId: number | EmailPropertyTypeType | EmailPropertyTypeTypeId;
  propertyId: string;
  emailId: string;
  createdOn: Date;
};

/**
 * Represents an email property which extends the summary of an email property
 * with an additional value field.
 *
 * @typedef {EmailPropertySummary} EmailPropertySummary - The summary of the email property.
 * @property {string} value - The actual value of the email property.
 */
export type EmailProperty = EmailPropertySummary & {
  value: string;
};
export const EmailPropertyCategoryTypeValues = [
  'Email Header',
  'Key Point',
  'Note',
  'Call to Action',
  'Compliance Scores',
  'Sentiment Analysis',
] as const;
export type EmailPropertyCategoryType =
  (typeof EmailPropertyCategoryTypeValues)[number];
export enum EmailPropertyCategoryTypeId {
  EmailHeader = 1,
  KeyPoint = 2,
  Note = 3,
  CallToAction = 4,
  ComplianceScores = 5,
  SentimentAnalysis = 6,
}
export const EmailPropertyCategoryTypeIdValues = [
  EmailPropertyCategoryTypeId.EmailHeader,
  EmailPropertyCategoryTypeId.KeyPoint,
  EmailPropertyCategoryTypeId.Note,
  EmailPropertyCategoryTypeId.CallToAction,
  EmailPropertyCategoryTypeId.ComplianceScores,
  EmailPropertyCategoryTypeId.SentimentAnalysis,
] as const;

export const EmailPropertyTypeTypeValues = [
  'From',
  'To',
  'Cc',
  'Call to Action',
  'Call to Action Response',
  'Compliance Score',
  'Violation Details',
  'Sentiment Analysis',
  'Key Points',
] as const;
export type EmailPropertyTypeType =
  (typeof EmailPropertyTypeTypeValues)[number];
export enum EmailPropertyTypeTypeId {
  From = 1,
  To = 2,
  Cc = 3,
  CallToAction = 4,
  CallToActionResponse = 5,
  ComplianceScore = 6,
  ViolationDetails = 7,
  SentimentAnalysis = 8,
  KeyPoints = 9,
}
export const EmailPropertyTypeTypeIdValues = [
  EmailPropertyTypeTypeId.From,
  EmailPropertyTypeTypeId.To,
  EmailPropertyTypeTypeId.Cc,
  EmailPropertyTypeTypeId.CallToAction,
  EmailPropertyTypeTypeId.CallToActionResponse,
  EmailPropertyTypeTypeId.ComplianceScore,
  EmailPropertyTypeTypeId.ViolationDetails,
  EmailPropertyTypeTypeId.SentimentAnalysis,
  EmailPropertyTypeTypeId.KeyPoints,
] as const;

export type EmailPropertyType = {
  typeId: number | EmailPropertyTypeType | EmailPropertyTypeTypeId;
  categoryId: number | EmailPropertyCategoryType | EmailPropertyCategoryTypeId;
  name: string;
  createdOn: Date;
};
export type EmailPropertyCategory = {
  categoryId: number | EmailPropertyCategoryType | EmailPropertyCategoryTypeId;
  description: string;
  createdOn: Date;
};

/**
 * An array of possible import status types for email messages.
 *
 * The possible values are:
 * - 'imported': The email message has been successfully imported.
 * - 'pending': The email message is pending import.
 * - 'not-found': The email message could not be found.
 * - 'in-progress': The email message import is currently in progress.
 *
 * This array is defined as a constant tuple to ensure type safety.
 */
export const ImportStatusTypeValues = [
  'imported',
  'pending',
  'not-found',
  'in-progress',
] as const;

/**
 * Represents the import status type of an email message.  Possible values are:
 * - 'imported': The email message has been successfully imported.
 * - 'pending': The email message is pending import.
 * - 'not-found': The email message could not be found.
 * - 'in-progress': The email message import is currently in progress.
 *
 * This type is defined as a union of the possible values to ensure type safety.
 */
export type ImportStatusType = (typeof ImportStatusTypeValues)[number];

/**
 * Represents the import status of a child email message.
 *
 * @property {string | null} emailId - The unique identifier for the email.
 * @property {string} providerId - The unique identifier for the email provider.
 * @property {ImportStatusType} status - The current import status of the email.
 */
export type MessageImportStatus = {
  /**
   * The unique identifier for the email.
   */
  emailId: string | null;
  /**
   * The unique identifier for the email provider.
   */
  providerId: string;
  /**
   * The current import status of the email.
   */
  status: ImportStatusType;
  /**
   * Name of the email provider.
   */
  provider: string;
};

/**
 * Describes the import status of an email message, including its provider ID, email ID,
 * and the status of the import process. Additionally, it contains reference information
 * for all emails that this email references.
 *
 * @property {string} providerId - The unique identifier for the email provider.  Note this
 *  may be a provider-specific identifier or a Message-ID header value.
 * @property {string} emailId - The unique identifier for the email.
 * @property {ImportStatusType} status - The current import status of the email.
 * @property {Array<ImportMessageStatus>} ref - An array of import statuses for all referenced emails.
 */
/**
 * Represents the status of an email message import along with its related data.
 *
 * @extends MessageImportStatus
 *
 * @property {Array<MessageImportStatus>} references - An array of import statuses for all referenced emails.
 * @property {Omit<ContactSummary, 'contactId' | 'name'> & { name?: string }} sender - The sender's contact summary with an optional name.
 * @property {Array<Omit<ContactSummary, 'contactId' | 'name'> & { name?: string }} recipients - An array of recipient contact summaries with optional names.
 * @property {string} subject - The subject of the email message.
 * @property {Date} receivedDate - The date the email message was received.
 */
export type MessageImportStatusWithChildren = MessageImportStatus & {
  /**
   * An array of import statuses for all referenced emails.
   */
  references: Array<MessageImportStatus>;
  /**
   * The sender's contact summary with an optional name.
   */
  sender: Omit<ContactSummary, 'contactId' | 'name'> & { name?: string };
  /**
   * An array of recipient contact summaries with optional names.
   */
  recipients: Array<
    Omit<ContactSummary, 'contactId' | 'name'> & { name?: string }
  >;
  /**
   * The subject of the email message.
   */
  subject: string;
  /**
   * The date the email message was received.
   */
  receivedDate: Date;
};

/**
 * Represents the response from an import operation.
 *
 * This type is a discriminated union that can represent either a successful or
 * unsuccessful import operation.
 *
 * @property success - Indicates whether the import operation was successful.
 * @property message - A message providing additional information about the import operation.
 * @property error - (Optional) An error message or object, present if the import operation failed.
 * @property data - (Optional) The imported data, present if the import operation was successful.
 */
export type ImportResponse =
  | {
      success: false;
      message: string;
      error: string | Error;
    }
  | {
      success: true;
      message: string;
      data: ImportSourceMessage;
    };
