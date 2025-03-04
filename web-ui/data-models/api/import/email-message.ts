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
