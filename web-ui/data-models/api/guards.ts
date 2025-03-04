import { Contact, ContactSummary } from './contact';
import { EmailPropertyType } from './import/email-message';

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

export const isEmailPropertyDataModel = (
  check: unknown
): check is EmailPropertyType => {
  if (!check || typeof check !== 'object') {
    return false;
  }
  return (
    'categoryId' in check &&
    (typeof check.categoryId === 'number' ||
      typeof check.categoryId === 'string') &&
    'typeId' in check &&
    (typeof check.typeId === 'number' || typeof check.typeId === 'string') &&
    'name' in check &&
    typeof check.name === 'string'
  );
};
