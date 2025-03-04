import { ContactSummary } from './contact';

export type EmailMessageSummary = {
  emailId: string;
  sender: ContactSummary;
  subject: string;
  sentOn: Date | string;
  threadId?: number | null;
  parentEmailId?: string | null;
  importedFromId?: string | null;
  globalMessageId?: string | null;
  recipients: ContactSummary[];
};

export type EmailMessage = EmailMessageSummary & {
  body: string;
};

export type EmailMessageStats = {
  total: number;
  lastUpdated: Date;
};
