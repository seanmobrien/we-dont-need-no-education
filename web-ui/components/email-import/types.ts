import { MessageImportStatusWithChildren } from '@/data-models/api/import/email-message';

export type SessionData = {
  providerId: string;
  status?: MessageImportStatusWithChildren;
  isActive: boolean;
  activeRequest?: Promise<Response>;
};
