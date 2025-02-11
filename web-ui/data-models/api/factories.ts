/**
 * @module Factories
 *
 * This module provides factory functions to create instances of data models
 * with default values. These functions can be used to generate mock data
 * for testing or to create new instances with optional overrides.
 */

import type { Contact, ContactSummary } from './contact';
import type { EmailMessage } from './email-message';

type Factory<T> = (overrides?: Partial<T>) => T;

/**
 * Factory function to create a `ContactSummary` object.
 *
 * @param overrides - Optional properties to override the default values.
 * @returns A `ContactSummary` object with default values, overridden by any provided properties.
 */
export const createContactSummary: Factory<ContactSummary> = (overrides) => ({
  contactId: -1,
  email: '',
  name: '',
  ...(overrides ?? {}),
});

/**
 * Factory function to create a Contact object with default values.
 *
 * @param overrides - Partial object to override default values.
 * @returns A Contact object with default and overridden values.
 */
export const createContact: Factory<Contact> = (overrides) => ({
  ...createContactSummary(overrides),
  jobDescription: '',
  phoneNumber: '',
  isDistrictStaff: false,
  ...(overrides ?? {}),
});

/**
 * Factory function to create an EmailMessage object with default values.
 * Allows overriding of default values through the `overrides` parameter.
 *
 * @param {Partial<EmailMessage>} overrides - An object containing properties to override the default values.
 * @returns {EmailMessage} - A new EmailMessage object with the specified overrides.
 */
export const createEmailMessage: Factory<EmailMessage> = (overrides) => ({
  emailId: -1,
  subject: '',
  body: '',
  sentOn: new Date().toISOString(),
  threadId: null,
  parentEmailId: null,
  ...overrides,
  sender: createContact(overrides?.sender),
});
