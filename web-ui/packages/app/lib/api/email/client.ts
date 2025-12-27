import type {
  EmailMessageSummary,
  EmailMessage,
  EmailMessageStats,
} from '@/data-models/api/email-message';
import type { PaginatedResultset, PaginationStats } from '@/data-models/_types';
import type { EmailSearchApiParams } from './types';
import siteMap from '@/lib/site-util/url-builder';
import {
  apiRequestHelperFactory,
  ApiRequestHelper,
} from '@/lib/send-api-request';
import { ICancellablePromiseExt } from '@repo/lib-typescript';

const apiRequest = <TResult>(
  cb: (api: ApiRequestHelper, builder: typeof siteMap.api.email) => TResult,
): TResult => {
  const apiHelper = apiRequestHelperFactory({ area: 'email' });
  const builder = siteMap.api.email;
  return cb(apiHelper, builder);
};

/**
 * Fetches a list of email messages.
 *
 * @returns {ICancellablePromiseExt<ReadonlyArray<EmailMessageSummary>>} A ICancellablePromiseExt that resolves to an array of email message summaries.
 */
export const getEmailList = ({
  page,
  num,
}: Omit<PaginationStats, 'total'>): ICancellablePromiseExt<
  ReadonlyArray<EmailMessageSummary>
> =>
  apiRequest((apiHelper, builder) =>
    apiHelper.get<ReadonlyArray<EmailMessageSummary>>({
      url: builder.page({ page, num }),
      action: 'list',
    }),
  );

/**
 * Fetches a specific email message by its ID.
 *
 * @param {number} id - The ID of the email message to fetch.
 * @returns {ICancellablePromiseExt<ReadonlyArray<EmailMessage>>} A ICancellablePromiseExt that resolves to the email message.
 */
export const getEmail = (id: string): ICancellablePromiseExt<EmailMessage> =>
  apiRequest((apiHelper, builder) =>
    apiHelper.get<EmailMessage>({
      url: builder.page(id),
      action: 'load',
    }),
  );

/**
 * Creates a new email record.
 *
 * @param {Omit<EmailMessage, 'emailId'>} email - The email message data to create.
 * @returns {ICancellablePromiseExt<EmailMessage>} A ICancellablePromiseExt that resolves to the created email message.
 */
export const createEmailRecord = (
  email: Omit<EmailMessage, 'emailId'>,
): ICancellablePromiseExt<EmailMessage> =>
  apiRequest((apiHelper, builder) =>
    apiHelper.post<EmailMessage>({
      url: builder.page(),
      action: 'create',
      input: email,
    }),
  );

/**
 * Updates an existing email record.
 *
 * @param {EmailMessage} email - The email message data to update.
 * @returns {ICancellablePromiseExt<EmailMessage>} A ICancellablePromiseExt that resolves to the updated email message.
 */
export const updateEmailRecord = (
  email: EmailMessage,
): ICancellablePromiseExt<EmailMessage> =>
  apiRequest((apiHelper, builder) =>
    apiHelper.put<EmailMessage>({
      url: builder.page(),
      action: 'update',
      input: email,
    }),
  );

/**
 * Writes an email record. If the email has an `emailId` greater than 0, it updates the existing record.
 * Otherwise, it creates a new email record.
 *
 * @param email - The email message object. It omits the `emailId` property but allows it to be partially included.
 * @returns A cancellable promise that resolves to the email message.
 */
export const writeEmailRecord = (
  email: Omit<EmailMessage, 'emailId'> & Partial<Pick<EmailMessage, 'emailId'>>,
): ICancellablePromiseExt<EmailMessage> =>
  (email.emailId ?? 0 > 0)
    ? updateEmailRecord(email as EmailMessage)
    : createEmailRecord(email);

/**
 * Deletes an email record by its ID.
 *
 * @param {number} id - The ID of the email message to delete.
 * @returns {ICancellablePromiseExt<EmailMessageSummary>} A ICancellablePromiseExt that resolves to the summary of the deleted email message.
 */
export const deleteEmailRecord = (
  id: number,
): ICancellablePromiseExt<EmailMessageSummary> =>
  apiRequest((apiHelper, builder) =>
    apiHelper.delete<EmailMessageSummary>({
      url: builder.page(id),
      action: 'delete',
    }),
  );

/**
 * Fetches email statistics.
 *
 * @returns {ICancellablePromiseExt<EmailMessageStats>} A ICancellablePromiseExt that resolves to the email message statistics.
 */
export const getEmailStats = (): ICancellablePromiseExt<EmailMessageStats> =>
  apiRequest((apiHelper, builder) =>
    apiHelper.get<EmailMessageStats>({
      url: builder.stats(),
      action: 'stats',
    }),
  );

/**
 * Fetches email search results based on the provided search parameters.
 *
 * @param {EmailSearchApiParams} ops - The search parameters.
 * @returns {ICancellablePromiseExt<PaginatedResultset<EmailMessageSummary>>} A ICancellablePromiseExt that resolves to a paginated result set of email message summaries.
 */
export const getEmailSearchResults = (
  ops: EmailSearchApiParams,
): ICancellablePromiseExt<PaginatedResultset<EmailMessageSummary>> =>
  apiRequest((apiHelper, builder) =>
    apiHelper.get<PaginatedResultset<EmailMessageSummary>>({
      url: builder.search(ops),
      action: 'search',
    }),
  );
