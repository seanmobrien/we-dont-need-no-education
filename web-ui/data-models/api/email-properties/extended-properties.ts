import { EmailPropertySummary } from './property-type';

/**
 * Details for a Call To Action property on an email.
 * Extends EmailPropertySummary (except typeId) with CTA-specific fields.
 */
export type CallToActionDetails = Omit<EmailPropertySummary, 'typeId'> & {
  /**
   * @property {Date | null} openedDate - When the CTA was opened.
   */
  openedDate: Date | null;
  /**
   * @property {Date | null} closedDate - When the CTA was closed.
   */
  closedDate: Date | null;
  /**
   * @property {Date | null} compliancyCloseDate - When the CTA was closed for compliance.
   */
  compliancyCloseDate: Date | null;
  /**
   * @property {number} completionPercentage - Completion percentage for the CTA.
   */
  completionPercentage: number;
  /**
   * @property {number | null} policyId - Associated policy ID, if any.
   */
  policyId: number | null;
  /**
   * @property {string} value - The value/content of the CTA.
   */
  value: string;
};

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
  severityRanking: number | null;
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
};

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
