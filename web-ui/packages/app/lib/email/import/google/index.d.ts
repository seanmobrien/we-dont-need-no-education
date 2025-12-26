/**
 * Google email import module exports
 * @module @/lib/email/import/google
 */
import { StageAttachmentProps, AttachmentStagedResult } from './types';
import { mapContact, mapContacts } from './utilities';
import { managerMapFactory } from './managermapfactory';
declare module '@/lib/email/import/google' {
  export {
    StageAttachmentProps,
    AttachmentStagedResult,
    mapContact,
    mapContacts,
    managerMapFactory,
  };
}
