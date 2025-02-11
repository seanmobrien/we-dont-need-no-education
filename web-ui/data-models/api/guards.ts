import { Contact, ContactSummary } from './contact';

export const isContactSummary = (check: unknown): check is ContactSummary => {
  const candidate = check as ContactSummary;
  return (
    typeof candidate?.contactId === 'number' &&
    typeof candidate?.name === 'string' &&
    typeof candidate?.email === 'string'
  );
};
export const isContact = (check: unknown): check is Contact => {
  const candidate = check as Contact;
  return (
    (isContactSummary(check) &&
      typeof candidate?.jobDescription === 'string') ||
    typeof candidate?.isDistrictStaff === 'boolean'
  );
};
