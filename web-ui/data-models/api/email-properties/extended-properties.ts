import { EmailPropertySummary } from './property-type';

export type CallToActionDetails = Omit<EmailPropertySummary, 'typeId'> & {
  openedDate: Date | null;
  closedDate: Date | null;
  compliancyCloseDate: Date | null;
  completionPercentage: number;
  policyId: number | null;
  value: string;
};

export type KeyPointsDetails = Omit<EmailPropertySummary, 'typeId'> & {
  relevance: number | null;
  compliance: number | null;
  severityRanking: number | null;
  inferred: boolean;
  value: string;
};

export type CallToActionResponseDetails = Omit<
  EmailPropertySummary,
  'typeId'
> & {
  actionPropertyId: string;
  completionPercentage: number;
  responseTimestamp: Date;
  value: string;
};

export type ComplianceScoresDetails = Omit<EmailPropertySummary, 'typeId'> & {
  actionPropertyId: string | null;
  complianceScore: number | null;
  violationsFound: number;
  responseDelayDays: number;
  overallGrade: string | null;
  evaluatedOn: Date;
  value: string;
};

export type ViolationDetails = Omit<EmailPropertySummary, 'typeId'> & {
  attachmentId: number | null;
  keyPointPropertyId: string | null;
  actionPropertyId: string | null;
  violationType: string;
  severityLevel: number | null;
  detectedBy: string;
  detectedOn: Date;
  value: string;
};

export type EmailSentimentAnalysisDetails = Omit<
  EmailPropertySummary,
  'typeId'
> & {
  sentimentScore: number | null;
  detectedHostility: boolean;
  flaggedPhrases: string;
  detectedOn: Date;
  value: string;
};
