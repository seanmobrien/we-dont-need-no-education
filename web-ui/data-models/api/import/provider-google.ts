import type { gmail_v1 } from '@googleapis/gmail';

export type GmailEmailImportSource = gmail_v1.Schema$Message;
export type GmailEmailMessagePart = gmail_v1.Schema$MessagePart;
export type GmailEmailMessagePayload = GmailEmailMessagePart;
export type GmailEmailMessageHeader =
  Required<GmailEmailMessagePart>['headers'][number];

export type GmailMessagdApi = gmail_v1.Gmail['users']['messages'];
