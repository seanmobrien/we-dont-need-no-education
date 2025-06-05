export type EmailPropertyCategory = {
  categoryId: number | EmailPropertyCategoryType | EmailPropertyCategoryTypeId;
  description: string;
  createdOn: Date;
}; /**
 * Represents a summary of email properties.
 *
 * @property {string} typeId - The type identifier of the email property.
 * @property {string} propertyId - The unique identifier of the property.
 * @property {string} emailId - The unique identifier of the email.
 * @property {Date} createdOn - The date when the email property was created.
 *
 * Addtionally, the following properties are loaded from related tables
 *
 * @property {string} typeName - The name of the property type
 * @property {number} categoryId  - The related property category identifier
 * @property {number} categoryName = The nameof the assocaited property caterogy.
 */

export type EmailPropertySummary = {
  typeId: number | EmailPropertyTypeType | EmailPropertyTypeTypeId;
  propertyId: string;
  documentId: number;
  createdOn: Date;
  categoryId?: number;
  typeName?: string;
  categoryName?: string;
  tags?: string[];
  policy_basis?: string[];
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
  Note = 102,
  ManualReview = 1000,
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
