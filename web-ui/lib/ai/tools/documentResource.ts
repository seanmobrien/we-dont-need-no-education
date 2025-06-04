/* eslint-disable @typescript-eslint/no-explicit-any */
export type DocumentResource = any;
export type EmailResource = any;
export type AttachmentResource = any;
export type DocumentPropertyResource = any;
export type DocumentResourceIndex = {
  unitId: number;
  emailId: string | null;
  attachmentId: number | null;
  documentPropertyId: string | null;
  documentType:
    | 'email'
    | 'attachment'
    | 'key-point'
    | 'call-to-action'
    | 'responsive-action'
    | 'note';
  createdOn: Date;
};
