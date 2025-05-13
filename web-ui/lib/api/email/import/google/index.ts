/**
 * @module googleEmailImport
 *
 * This module provides functions to interact with the Google email import API.
 * It includes functionalities to search for emails, load email details, and queue emails for import.
 *
 * Functions:
 * - `searchEmails`: Searches for emails based on provided criteria.
 * - `loadEmail`: Loads the details of a specific email by its ID.
 * - `queueEmailImport`: Queues an email for import by its ID.
 */
import type {
  AdditionalRequestParams,
  ApiRequestHelper,
} from '@/lib/send-api-request';
import { apiRequestHelperFactory } from '@/lib/send-api-request';

import siteMap from '@/lib/site-util/url-builder';
import type {
  PaginatedResultset,
  EmailSearchResult,
  ImportResponse,
  ImportSourceMessage,
  MessageImportStatusWithChildren,
} from '@/data-models';

const apiRequest = <TResult>(
  cb: (
    api: ApiRequestHelper,
    builder: typeof siteMap.api.email.import.google,
  ) => TResult,
): TResult => {
  const apiHelper = apiRequestHelperFactory({ area: 'email/import/google' });
  const builder = siteMap.api.email.import.google;
  return cb(apiHelper, builder);
};

/**
 * Searches for emails based on the provided criteria.
 *
 * @param from - The sender's email address to filter by.
 * @param to - The recipient's email address to filter by.
 * @param label - An array of labels to filter by.
 * @param page - The page number for pagination (default is 1).
 * @param limit - The number of results per page (default is 100).
 * @returns A promise that resolves to a paginated result set of email search results.
 */
export const searchEmails = (
  {
    from,
    to,
    label,
    page = 1,
    limit = 100,
  }: {
    from?: string;
    to?: string;
    label?: string[];
    page?: number;
    limit?: number;
  },
  params?: AdditionalRequestParams,
) => {
  if (from === 'm.sean.o@gmail.com') {
    to = '@plsas.org';
  }

  return apiRequest((api, builder) =>
    api.get<PaginatedResultset<EmailSearchResult, string | undefined>>(
      {
        url: builder.search({
          from,
          to,
          label,
          page,
          limit,
        }),
        action: 'search',
      },
      params,
    ),
  );
};
/**
 * Loads the details of a specific email by its ID.
 *
 * @param emailId - The ID of the email to load.
 * @returns A promise that resolves to the details of the email.
 */
export const loadEmail = (emailId: string, params?: AdditionalRequestParams) =>
  apiRequest((api, builder) =>
    api.get<ImportSourceMessage>(
      {
        url: builder.page('message', emailId),
        action: 'load',
      },
      params,
    ),
  );

/**
 * Queues an email for import by its ID.
 *
 * @param emailId - The ID of the email to queue for import.
 * @returns A promise that resolves to the details of the queued email.
 */
export const queueEmailImport = (
  emailId: string,
  params?: AdditionalRequestParams,
) =>
  apiRequest((api, builder) => {
    debugger;
    return api.post<ImportSourceMessage>(
      {
        url: builder.page('message', emailId),
        action: 'queue',
        input: {},
      },
      params,
    );
  });

/**
 * Stages an email for import by its ID.
 *
 * @param emailId - The ID of the email to queue for import.
 * @returns A promise that resolves to the details of the queued email.
 */
export const createStagingRecord = (
  emailId: string,
  params?: AdditionalRequestParams,
) =>
  apiRequest((api, builder) =>
    api.put<ImportSourceMessage>(
      {
        url: builder.message.page(emailId),
        action: 'stage',
        input: {},
      },
      params,
    ),
  );

/**
 * Stages an email for import by its ID.
 *
 * @param emailId - The ID of the email to queue for import.
 * @returns A promise that resolves to the details of the imported email.
 */
export const importEmailRecord = (
  emailId: string,
  params?: AdditionalRequestParams,
) =>
  apiRequest((api, builder) =>
    api.post<ImportResponse>(
      {
        url: builder.message.page(emailId),
        action: 'import',
        input: {},
      },
      params,
    ),
  );

/**
 * Queries the import status of a message by its email ID.
 *
 * @param emailId - The unique identifier of the email message.
 * @param params - Optional additional request parameters.
 * @returns A promise that resolves to the import status of the message, including any child messages.
 */
export const queryImportStatus = (
  emailId: string,
  params?: AdditionalRequestParams,
) =>
  apiRequest((api, builder) =>
    api.get<MessageImportStatusWithChildren>(
      {
        url: builder.child('message', emailId).page('status'),
        action: 'status',
      },
      params,
    ),
  );
