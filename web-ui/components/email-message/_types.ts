import { EmailMessage } from '@/data-models';

export type SubmitRefCallbackInstance = {
  saveEmailCallback: () => Promise<Partial<EmailMessage | null>>;
};
