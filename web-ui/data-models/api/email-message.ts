import { Contact, ContactSummary } from './contact';

export type EmailMessageSummary = {
  emailId: number;
  senderId: number;
  subject: string;
  sentOn: Date;
  threadId?: number;
  contacts?: Array<ContactSummary>;
};

export type EmailMessage = EmailMessageSummary & {
  body: string;
  parentEmailId?: string;
};
