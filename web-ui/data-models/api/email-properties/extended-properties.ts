import { EmailPropertySummary } from './property-type';

export type CallToActionDetails = Omit<EmailPropertySummary, 'typeId'> & {
  openedDate: Date | null;
  closedDate: Date | null;
  compliancyCloseDate: Date | null;
  completionPercentage: number;
  policyId: number | null;
  value: string;
};
