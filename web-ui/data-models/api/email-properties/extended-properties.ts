import { EmailPropertySummary } from './property-type';

/**
 * An array of all field names available in CallToActionDetails.
 */
export const CallToActionDetailKeyValues = [
  'opened_date',
  'closed_date',
  'compliancy_close_date',
  'completion_percentage',
  'compliance_rating',
  'inferred',
  'compliance_date_enforceable',
  'reasonable_request',
  'reasonable_reasons',
  'sentiment',
  'sentiment_reasons',
  'compliance_rating_reasons',
  'severity',
  'severity_reason',
  'title_ix_applicable',
  'title_ix_applicable_reasons',
  'closure_actions',
  'value',
] as const;

/**
 * Represents the valid key types for call-to-action details.
 *
 * This type is derived from the values of the `CallToActionDetailKeyValues` array,
 * ensuring that only predefined string values are allowed.
 *
 * @see CallToActionDetailKeyValues
 */
export type CallToActionDetailKeyType =
  (typeof CallToActionDetailKeyValues)[number];

/**
 * Details for a Call To Action property on an email.
 * Extends EmailPropertySummary (except typeId) with CTA-specific fields.
 */
/**
 * Represents the extended properties for a call to action (CTA) within an email property summary,
 * excluding the 'typeId' field. This type includes detailed tracking of CTA lifecycle events,
 * compliance information, sentiment analysis, and additional metadata.
 *
 * @remarks
 * - Tracks when the CTA was opened, closed, and closed for compliance.
 * - Includes completion percentage and compliance-related ratings and reasons.
 * - Supports sentiment and severity analysis with optional explanations.
 * - Provides fields for Title IX applicability and closure actions.
 * - Contains a description of the call to action.
 *
 * @property {Date | null} opened_date - When the CTA was opened.
 * @property {Date | null} closed_date - When the CTA was closed.
 * @property {Date | null} compliancy_close_date - When the CTA was closed for compliance.
 * @property {number} completion_percentage - Completion percentage for the CTA.
 * @property {number | null} [compliance_rating] - Optional compliance rating.
 * @property {boolean} inferred - Indicates if the CTA was inferred.
 * @property {boolean} compliance_date_enforceable - Whether the compliance date is enforceable.
 * @property {number | null} [reasonable_request] - Optional reasonable request indicator.
 * @property {string[] | null} [reasonable_reasons] - Optional reasons for reasonable request.
 * @property {number | null} [sentiment] - Optional sentiment score.
 * @property {string[] | null} [sentiment_reasons] - Optional reasons for sentiment score.
 * @property {string[] | null} [compliance_rating_reasons] - Optional reasons for compliance rating.
 * @property {number | null} [severity] - Optional severity score.
 * @property {string[] | null} [severity_reason] - Optional reasons for severity score.
 * @property {number | null} [title_ix_applicable] - Optional Title IX applicability indicator.
 * @property {string[] | null} [title_ix_applicable_reasons] - Optional reasons for Title IX applicability.
 * @property {string[] | null} [closure_actions] - Optional closure actions taken.
 * @property {string} value - A description of the call to action.
 */
export type CallToActionDetails = Omit<EmailPropertySummary, 'typeId'> & {
  /**
   * @property {Date | null} openedDate - When the CTA was opened.
   */
  opened_date: Date | null;
  /**
   * @property {Date | null} closedDate - When the CTA was closed.
   */
  closed_date: Date | null;
  /**
   * @property {Date | null} compliancyCloseDate - When the CTA was closed for compliance.
   */
  compliancy_close_date: Date | null;
  /**
   * @property {number} completionPercentage - Completion percentage for the
   */
  completion_percentage: number;

  /**
   * Optional compliance rating.
   * @type {number | null}
   */
  compliance_rating?: number | null;
  /**
   * Indicates if the CTA was inferred.
   * @type {boolean}
   */
  inferred: boolean;
  /**
   * Whether the compliance date is enforceable.
   * @type {boolean}
   */
  compliance_date_enforceable: boolean;
  /**
   * Optional reasonable request indicator.
   * @type {number | null}
   */
  reasonable_request?: number | null;
  /**
   * Optional reasons for reasonable request.
   * @type {string[] | null}
   */
  reasonable_reasons?: string[] | null;
  /**
   * Optional sentiment score.
   * @type {number | null}
   */
  sentiment?: number | null;
  /**
   * Optional reasons for sentiment score.
   * @type {string[] | null}
   */
  sentiment_reasons?: string[] | null;
  /**
   * Optional reasons for compliance rating.
   * @type {string[] | null}
   */
  compliance_rating_reasons?: string[] | null;
  /**
   * Optional severity score.
   * @type {number | null}
   */
  severity?: number | null;
  /**
   * Optional reasons for severity score.
   * @type {string[] | null}
   */
  severity_reason?: string[] | null;
  /**
   * Optional Title IX applicability indicator.
   * @type {number | null}
   */
  title_ix_applicable?: number | null;
  /**
   * Optional reasons for Title IX applicability.
   * @type {string[] | null}
   */
  title_ix_applicable_reasons?: string[] | null;
  /**
   * Optional closure actions taken.
   * @type {string[] | null}
   */
  closure_actions?: string[] | null;
  /**
   * @property {string} value - A description of the call to action.
   */
  value: string;
  /**
   * Average compliance rating for Chapter 13 assigned to all actions identified as responsive to this cta.
   * @type {number | null}
   */
  compliance_average_chapter_13?: number | null;
  /**
   * Reasons identified for the {@link compliance_average_chapter_13} rating.
   * @type {string[] | null}
   */
  compliance_chapter_13_reasons?: string[] | null;
};

/**
 * An array of all field names available in KeyPointsDetails.
 */
export const KeyPointsDetailsKeyValues = [
  'relevance',
  'compliance',
  'severityRanking',
  'inferred',
  'value',
] as const;

/**
 * Represents the valid key types for KeyPointsDetails.
 *
 * This type is derived from the values of the `KeyPointsDetailsKeyValues` array,
 * ensuring that only predefined string values are allowed.
 *
 * @see KeyPointsDetailsKeyValues
 */
export type KeyPointsDetailsKeyType =
  (typeof KeyPointsDetailsKeyValues)[number];

/**
 * Details for a Key Point property on an email.
 * Extends EmailPropertySummary (except typeId) with key point-specific fields.
 */
export type KeyPointsDetails = Omit<EmailPropertySummary, 'typeId'> & {
  /**
   * @property {number | null} relevance - Relevance score for the key point.
   */
  relevance: number | null;
  /**
   * @property {number | null} compliance - Compliance score for the key point.
   */
  compliance: number | null;
  /**
   * @property {number | null} severityRanking - Severity ranking for the key point.
   */
  severity: number | null;
  /**
   * @property {boolean} inferred - Whether the key point was inferred.
   */
  inferred: boolean;
  /**
   * @property {string} value - The value/content of the key point.
   */
  value: string;
};

/**
 * An array of all field names available in CallToActionResponseDetails.
 */
export const CallToActionResponseDetailsKeyValues = [
  'actionPropertyId',
  'completionPercentage',
  'responseTimestamp',
  'value',
] as const;

/**
 * Represents the valid key types for CallToActionResponseDetails.
 *
 * This type is derived from the values of the `CallToActionResponseDetailsKeyValues` array,
 * ensuring that only predefined string values are allowed.
 *
 * @see CallToActionResponseDetailsKeyValues
 */
export type CallToActionResponseDetailsKeyType =
  (typeof CallToActionResponseDetailsKeyValues)[number];

/**
 * Details for a Call To Action Response property on an email.
 * Extends EmailPropertySummary (except typeId) with response-specific fields.
 */
export type CallToActionResponseDetails = Omit<
  EmailPropertySummary,
  'typeId'
> & {
  /**
   * @property {string} actionPropertyId - The property ID of the related action.
   */
  actionPropertyId: string;
  /**
   * @property {number} completionPercentage - Completion percentage for the response.
   */
  completionPercentage: number;
  /**
   * @property {Date} responseTimestamp - When the response was recorded.
   */
  responseTimestamp: Date;
  /**
   * @property {string} value - The value/content of the response.
   */
  value: string;
  /**
   * @property {number} severity - Severity level of the response.
   */
  severity?: number;
  /**
   * @property {string[]} severity_reasons - Reasons for the severity level.
   */
  severity_reasons?: string[];
  /**
   * @property {boolean} inferred - Whether the response was inferred.
   */
  inferred?: boolean;
  /**
   * @property {number} sentiment - Sentiment score of the response.
   */
  sentiment?: number;
  /**
   * @property {string[]} sentiment_reasons - Reasons for the sentiment score.
   */
  sentiment_reasons?: string[];
  /**
   * @property {number} compliance_average_chapter_13 - Average compliance rating for Chapter 13.
   */
  compliance_average_chapter_13?: number;
  /**
   * @property {string[]} compliance_chapter_13_reasons - Reasons for the Chapter 13 compliance rating.
   */
  compliance_chapter_13_reasons?: string[];
};

/**
 * An array of all field names available in ComplianceScoresDetails.
 */
export const ComplianceScoresDetailsKeyValues = [
  'actionPropertyId',
  'complianceScore',
  'violationsFound',
  'responseDelayDays',
  'overallGrade',
  'evaluatedOn',
  'value',
] as const;

/**
 * Represents the valid key types for ComplianceScoresDetails.
 *
 * This type is derived from the values of the `ComplianceScoresDetailsKeyValues` array,
 * ensuring that only predefined string values are allowed.
 *
 * @see ComplianceScoresDetailsKeyValues
 */
export type ComplianceScoresDetailsKeyType =
  (typeof ComplianceScoresDetailsKeyValues)[number];

/**
 * Details for a Compliance Scores property on an email.
 * Extends EmailPropertySummary (except typeId) with compliance scoring fields.
 */
export type ComplianceScoresDetails = Omit<EmailPropertySummary, 'typeId'> & {
  /**
   * @property {string | null} actionPropertyId - The property ID of the related action, if any.
   */
  actionPropertyId: string | null;
  /**
   * @property {number | null} complianceScore - The compliance score.
   */
  complianceScore: number | null;
  /**
   * @property {number} violationsFound - Number of violations found.
   */
  violationsFound: number;
  /**
   * @property {number} responseDelayDays - Delay in response, in days.
   */
  responseDelayDays: number;
  /**
   * @property {string | null} overallGrade - Overall grade assigned.
   */
  overallGrade: string | null;
  /**
   * @property {Date} evaluatedOn - When the compliance was evaluated.
   */
  evaluatedOn: Date;
  /**
   * @property {string} value - The value/content of the compliance score.
   */
  value: string;
};

/**
 * An array of all field names available in ViolationDetails.
 */
export const ViolationDetailsKeyValues = [
  'attachmentId',
  'keyPointPropertyId',
  'actionPropertyId',
  'violationType',
  'severityLevel',
  'detectedBy',
  'detectedOn',
  'value',
] as const;

/**
 * Represents the valid key types for ViolationDetails.
 *
 * This type is derived from the values of the `ViolationDetailsKeyValues` array,
 * ensuring that only predefined string values are allowed.
 *
 * @see ViolationDetailsKeyValues
 */
export type ViolationDetailsKeyType =
  (typeof ViolationDetailsKeyValues)[number];

/**
 * Details for a Violation property on an email.
 * Extends EmailPropertySummary (except typeId) with violation-specific fields.
 */
export type ViolationDetails = Omit<EmailPropertySummary, 'typeId'> & {
  /**
   * @property {number | null} attachmentId - Related attachment ID, if any.
   */
  attachmentId: number | null;
  /**
   * @property {string | null} keyPointPropertyId - Related key point property ID, if any.
   */
  keyPointPropertyId: string | null;
  /**
   * @property {string | null} actionPropertyId - Related action property ID, if any.
   */
  actionPropertyId: string | null;
  /**
   * @property {string} violationType - Type of violation.
   */
  violationType: string;
  /**
   * @property {number | null} severityLevel - Severity level of the violation.
   */
  severityLevel: number | null;
  /**
   * @property {string} detectedBy - Who detected the violation.
   */
  detectedBy: string;
  /**
   * @property {Date} detectedOn - When the violation was detected.
   */
  detectedOn: Date;
  /**
   * @property {string} value - The value/content of the violation.
   */
  value: string;
};

/**
 * An array of all field names available in EmailSentimentAnalysisDetails.
 */
export const EmailSentimentAnalysisDetailsKeyValues = [
  'sentimentScore',
  'detectedHostility',
  'flaggedPhrases',
  'detectedOn',
  'value',
] as const;

/**
 * Represents the valid key types for EmailSentimentAnalysisDetails.
 *
 * This type is derived from the values of the `EmailSentimentAnalysisDetailsKeyValues` array,
 * ensuring that only predefined string values are allowed.
 *
 * @see EmailSentimentAnalysisDetailsKeyValues
 */
export type EmailSentimentAnalysisDetailsKeyType =
  (typeof EmailSentimentAnalysisDetailsKeyValues)[number];

/**
 * Details for an Email Sentiment Analysis property.
 * Extends EmailPropertySummary (except typeId) with sentiment analysis fields.
 */
export type EmailSentimentAnalysisDetails = Omit<
  EmailPropertySummary,
  'typeId'
> & {
  /**
   * @property {number | null} sentimentScore - The sentiment score.
   */
  sentimentScore: number | null;
  /**
   * @property {boolean} detectedHostility - Whether hostility was detected.
   */
  detectedHostility: boolean;
  /**
   * @property {string} flaggedPhrases - Phrases that were flagged.
   */
  flaggedPhrases: string;
  /**
   * @property {Date} detectedOn - When the sentiment was detected.
   */
  detectedOn: Date;
  /**
   * @property {string} value - The value/content of the sentiment analysis.
   */
  value: string;
};
