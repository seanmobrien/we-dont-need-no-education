import { EmailMessage } from '@/data-models/api/email-message';

export type SubmitRefCallbackInstance = {
  saveEmailCallback: () => Promise<Partial<EmailMessage | null>>;
};
