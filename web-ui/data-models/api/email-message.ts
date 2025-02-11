import { ContactSummary } from './contact';

export type EmailMessageSummary = {
  emailId: number;
  sender: ContactSummary;
  subject: string;
  sentOn: Date | string;
  threadId?: number | null;
  parentEmailId?: number | null;
  recipients: ContactSummary[];
};

export type EmailMessage = EmailMessageSummary & {
  body: string;
  // TODO: Recipients
};
