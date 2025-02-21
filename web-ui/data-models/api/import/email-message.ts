import { gmail_v1 } from '@googleapis/gmail'; // Adjust the import path as necessary
import { EmailContact } from './email-contact'; // Adjust the import path as necessary

export const ImportStageValues = [
  'new',
  'staged',
  'headers',
  'body',
  'attachments',
  'contacts',
  'completed',
] as const;
export type ImportStage = (typeof ImportStageValues)[number];

export type GmailEmailImportSource = gmail_v1.Schema$Message;

export type ImportSourceMessage = {
  id?: string;
  targetId?: number;
  raw: GmailEmailImportSource;
  stage: ImportStage;
};

export type StagedMessageSummary = {
  id: string;
  stage: ImportStage;
  targetId?: number;
  timestamp: Date;
  sender: string;
  recipients: string;
};
