import { Contact, ContactSummary } from './contact';
import {
  MessageImportStatus,
  MessageImportStatusWithChildren,
} from './import/email-message';
import { EmailPropertyType } from './email-properties/property-type';

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
    isContactSummary(check) &&
    ((typeof candidate?.jobDescription === 'string' &&
      candidate.jobDescription.length > 0) ||
      typeof candidate?.isDistrictStaff === 'boolean')
  );
};

export const isEmailPropertyDataModel = (
  check: unknown,
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

/**
 * Type guard function to check if a given value is of type `ImportMessageChildStatus`.
 *
 * @param check - The value to be checked.
 * @returns A boolean indicating whether the value is an `ImportMessageChildStatus`.
 *
 * The function checks if the value is an object and contains the following properties:
 * - `emailId`: a string or null
 * - `providerId`: a string
 * - `status`: a string
 */
export const isMessageImportStatus = (
  check: unknown,
): check is MessageImportStatus =>
  typeof check === 'object' &&
  !!check &&
  'emailId' in check &&
  (typeof check.emailId === 'string' || check.emailId === null) &&
  'providerId' in check &&
  typeof check.providerId === 'string' &&
  'status' in check &&
  typeof check.status === 'string';

/**
 * Type guard function to check if the given object is of type `ImportMessageStatus`.
 *
 * This function checks if the provided object is an `ImportMessageChildStatus` and
 * if it contains a `ref` property.
 *
 * @param check - The object to check.
 * @returns `true` if the object is an `ImportMessageStatus`, otherwise `false`.
 */
export const isMessageImportWithChildrenStatus = (
  check: unknown,
): check is MessageImportStatusWithChildren =>
  isMessageImportStatus(check) && 'references' in check && 'subject' in check;
