import { ContactSummary } from './contact';

export type EmailMessageSummary = {
  emailId: number;
  sender: ContactSummary;
  subject: string;
  sentOn: Date | string;
  threadId?: number;
};

export type EmailMessage = EmailMessageSummary & {
  body: string;
  parentEmailId?: number;
  // TODO: Recipients
};
