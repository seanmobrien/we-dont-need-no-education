import { StagedAttachment } from '@/lib/api/email/import/staged-attachment';
import { QueueNameValues } from './constants';

export type QueueNameType = (typeof QueueNameValues)[number];

export type AttachmentDownloadJob = {
  model: StagedAttachment;
};

export type AttachmentDownloadResult = {
  result: StagedAttachment;
  success: boolean;
  error?: string;
};
