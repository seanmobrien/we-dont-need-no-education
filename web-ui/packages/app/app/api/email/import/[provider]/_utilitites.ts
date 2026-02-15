import { normalizeNullableNumeric } from '@/data-models/_utilities';
import { PaginationStats } from '@/data-models/_types';
import {
  GmailEmailImportSource,
  ImportSourceMessage,
  ImportStage,
  MessageImportStatusWithChildren,
  ImportStatusType,
  MessageImportStatus,
} from '@/data-models/api/import/email-message';
import { query } from '@compliance-theater/database/driver';
import { NextRequest, NextResponse } from 'next/server';
import { googleProviderFactory } from './_googleProviderFactory';
import { isError, LoggedError } from '@compliance-theater/logger';
import { auth } from '@compliance-theater/auth';
import {
  GmailEmailMessageHeader,
  GmailEmailMessagePart,
  GmailEmailMessagePayload,
  GmailMessagdApi,
} from '@/data-models/api/import/provider-google';
import { MailQueryBuilder } from './_mailQueryBuilder';
import { ParsedHeaderMap } from '@/lib/email/parsedHeaderMap';
import { NextApiRequest } from 'next/types';

/**
 * Parses pagination statistics from a URL or URLSearchParams object.
 *
 * @param req - The request object containing pagination parameters. It can be either a URL or URLSearchParams.
 * @returns An object containing the parsed pagination statistics:
 * - `page`: The current page as a string.
 * - `num`: The number of items per page, defaulting to 100 if not specified or invalid.
 * - `total`: The total number of items, initialized to 0.
 */
export const parsePaginationStats = (
  req: URL | URLSearchParams,
): PaginationStats<string> => {
  if ('searchParams' in req) {
    req = req.searchParams;
  }
  const page = (req.get('page') ?? '').trim();
  const num = normalizeNullableNumeric(Number(req.get('num')), 100) ?? 100;

  return {
    page,
    num,
    total: 0,
  };
};

/**
 * An array of known error cause values for Gmail integration.
 *
 * The possible values are:
 * - 'unauthorized': The request is not authorized.
 * - 'invalid-args': The arguments provided are invalid.
 * - 'gmail-failure': A failure occurred on the Gmail side.
 * - 'email-not-found': The specified email was not found.
 * - 'email-exists': The email already exists.
 * - 'unknown-error': An unknown error occurred.
 *
 * @constant
 * @type {readonly string[]}
 */
const KnownGmailErrorCauseValues = [
  'unauthorized',
  'invalid-args',
  'gmail-failure',
  'email-not-found',
  'source-not-found',
  'email-exists',
  'unknown-error',
] as const;

/**
 * Represents the type of known Gmail error causes.
 *
 * This type is derived from the values of the `KnownGmailErrorCauseValues` array.
 * It allows for type-safe usage of Gmail error causes by restricting the values
 * to those defined in the `KnownGmailErrorCauseValues` array.
 */
export type KnownGmailErrorCauseType =
  (typeof KnownGmailErrorCauseValues)[number];

/**
 * Checks if the provided value is a known Gmail error cause.
 *
 * @param check - The value to check.
 * @returns A boolean indicating whether the value is a known Gmail error cause.
 */
export const isKnownGmailErrorCause = (
  check: unknown,
): check is KnownGmailErrorCauseType =>
  KnownGmailErrorCauseValues.includes(check as KnownGmailErrorCauseType);

/**
 * Checks if the provided value is a known Gmail error.
 *
 * @param check - The value to check.
 * @returns A boolean indicating whether the value is a known Gmail error.
 */
export const isKnownGmailError = (
  check: unknown,
): check is Error & { cause: KnownGmailErrorCauseType } =>
  isError(check) && isKnownGmailErrorCause(check.cause);

/**
 * A callback type used to push error handling of expected types up to the called method.
 *
 * @callback ErrorFilter
 * @param {Error} error - The error object that needs to be filtered.
 * @returns {NextResponse | null | undefined} - Returns a NextResponse if the error is handled,
 *                                              otherwise returns null or undefined.
 */
export type ErrorFilter = (error: unknown) => NextResponse | null | undefined;

/**
 * Provides a default error filter implementation for Gmail-related calls.
 * This function takes an error object and returns a NextResponse object
 * with an appropriate HTTP status code and error message based on the
 * specific cause of the error.
 *
 * @param {Error} error - The error object to be filtered.
 * @returns {NextResponse | null | undefined} - A NextResponse object with
 * the appropriate HTTP status code and error message, or null/undefined if
 * the error is not recognized.
 *
 * The function handles the following error causes:
 * - 'unauthorized': Returns a 401 Unauthorized response.
 * - 'email-exists': Returns a 409 Conflict response indicating the email already exists.
 * - 'email-not-found': Returns a 404 Not Found response indicating the email was not found.
 * - 'unknown-error': Returns a 500 Internal Server Error response for unknown errors.
 * - 'invalid-args': Returns a 400 Bad Request response for invalid arguments.
 * - 'gmail-failure': Returns a 500 Internal Server Error response for Gmail-specific failures.
 *
 * If the error cause is not recognized, the function returns null.
 */
export const defaultGmailErrorFilter = (
  error: unknown,
): NextResponse | null | undefined => {
  if (!isKnownGmailError(error)) {
    return undefined;
  }
  switch (error.cause) {
    case 'unauthorized':
      return NextResponse.json(
        { error: error.message ?? 'Unauthorized' },
        { status: 401 },
      );
    case 'email-exists':
      return NextResponse.json(
        { error: error.message ?? 'Email already exists' },
        { status: 409 },
      );
    case 'email-not-found':
    case 'source-not-found':
      return NextResponse.json(
        { error: error.message ?? 'Email not found' },
        { status: 404 },
      );
    case 'unknown-error':
      return NextResponse.json(
        { error: error.message ?? 'Unknown error' },
        { status: 500 },
      );
    case 'invalid-args':
      return NextResponse.json(
        { error: error.message ?? 'Invalid arguments' },
        { status: 400 },
      );
    case 'gmail-failure':
      return NextResponse.json(
        { error: error.message ?? 'Gmail error' },
        { status: 500 },
      );
    default:
      break;
  }
  // If we make it this far we do not recognize the error
  return undefined;
};

type EmailAndUserId = {
  userId: number;
  email: GmailEmailImportSource;
  mail: GmailMessagdApi;
};

/**
 * Retrieves a Gmail message using the provided provider and email ID.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.provider - The email provider name.
 * @param {string} params.emailId - The email ID to retrieve.
 * @returns {Promise<{ userId: number; email: any }>} The user ID and email data.
 * @throws {Error} If the user is not authenticated, if the provider or email ID is missing, if there is an error in the factory response, or if there is an error retrieving the email.
 */
const getGmailMessage = async ({
  provider,
  emailId,
  req,
}: {
  emailId: string;
  provider: string;
  req: NextRequest | NextApiRequest;
}): Promise<EmailAndUserId> => {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      throw new Error('Must be authenticated to call this API', {
        cause: 'unauthorized',
      });
    }
    const userId = Number(session.user.id);

    if (![provider, emailId].every(Boolean)) {
      throw new TypeError('Missing provider name or provider email id', {
        cause: 'invalid-args',
      });
    }

    const factoryResponse = await googleProviderFactory(provider, { req });
    if ('status' in factoryResponse) {
      throw new Error('Error in factory response', { cause: 'gmail-failure' });
    }

    const { mail } = factoryResponse;
    let googleMessageId = emailId;

    if (emailId.includes('@')) {
      const query = new MailQueryBuilder();
      query.appendQueryParam('rfc822msgid', emailId);
      const queryString = query.build();
      const googleResponse = await mail.list({
        userId: 'me',
        q: queryString,
      });

      if (googleResponse.data.messages?.length) {
        googleMessageId = googleResponse.data.messages[0].id!;
      } else {
        throw new Error('Email not found', { cause: 'email-not-found' });
      }
    }

    const googleResponse = await mail.get({
      userId: 'me',
      id: googleMessageId,
    });

    if (googleResponse.status !== 200) {
      if (googleResponse.status === 404) {
        throw new Error('Email not found', { cause: 'email-not-found' });
      }
      throw new Error('Error retrieving email', { cause: 'unknown-error' });
    }

    if (!googleResponse?.data) {
      throw new Error('No email data returned', { cause: 'email-not-found' });
    }

    return {
      userId,
      email: googleResponse.data,
      mail,
    };
  } catch (error) {
    if (isError(error)) {
      if (isKnownGmailErrorCause(error.cause)) {
        // rethrow known error types for caller to handle
        throw error;
      }
    }
    // For everything else, log the error and rethrow`
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'getGmailMessage',
      provider,
      emailId,
    });
    throw le;
  }
};

/**
 * Retrieves the current state of an email import process.
 *
 * @param {Object} params - The parameters for retrieving the current state.
 * @param {string} params.emailId - The ID of the email to retrieve the state for.
 * @param {number} params.userId - The ID of the user requesting the state.
 * @param {GmailEmailImportSource} [params.source] - The source of the email import, if available.
 * @returns {Promise<ImportSourceMessage | null>} - A promise that resolves to the current state of the email import, or null if not found.
 * @throws {Error} - Throws an error if the email has already been imported, if the email is not found, or if the user is unauthorized.
 */
const getCurrentState = async ({
  emailId,
  userId,
  source,
}: {
  emailId: string;
  userId: number;
  source?: GmailEmailImportSource;
}): Promise<ImportSourceMessage> => {
  const refresh = !!source;
  const messageField = refresh ? '' : ', to_json(s.message) AS message';
  const currentStateRows = await query((sql) =>
    sql<false, false>(
      `
          select s.external_id AS providerId, s.stage, s.id${messageField}, s."user_id", m.email_id AS targetId from emails m 
            right join staging_message s on s.external_id = m.imported_from_id
            where s.external_id = $1;`.toString(),
      [emailId],
    ),
  );
  if (!currentStateRows.length) {
    const existingEmailRows = await query(
      (sql) =>
        sql`select email_id from emails where imported_from_id = ${emailId};`,
    );
    if (existingEmailRows.length) {
      throw new Error(
        `Gmail Message ${emailId} has already been imported as email ${existingEmailRows[0].email_id}; manually delete the email if you want to re-import it.`,
        { cause: 'email-exists' },
      );
    }
    if (!source) {
      throw new Error(`Gmail message id ${emailId} not found.`, {
        cause: 'source-not-found',
      });
    }
    return {
      raw: source,
      stage: 'new',
      providerId: emailId,
      userId: userId,
      id: undefined,
    };
  }
  if (userId !== currentStateRows[0].userId) {
    throw new Error('Unauthorized', { cause: 'unauthorized' });
  }
  const raw = source ?? (currentStateRows[0].message as GmailEmailImportSource);
  if (!raw) {
    throw new Error(`Gmail message id ${emailId} not found.`, {
      cause: 'source-not-found',
    });
  }
  return {
    stage: currentStateRows[0].stage as ImportStage,
    id: currentStateRows[0].id as string,
    providerId: currentStateRows[0].providerid as string,
    targetId: currentStateRows[0].targetid as string,
    userId: userId,
    raw,
  };
};

interface GetImportMessageSourceOverloads {
  (params: {
    req: NextRequest | NextApiRequest;
    provider?: string;
    emailId?: string;
    refresh?: boolean;
    errorFilter: ErrorFilter;
  }): Promise<NextResponse | ImportSourceMessage | null>;
  (params: {
    req: NextRequest | NextApiRequest;
    provider?: string;
    emailId?: string;
    refresh?: boolean;
  }): Promise<ImportSourceMessage | null>;
}

/**
 * Retrieves the import message source for a given provider and email ID.
 *
 * @param params - The parameters for retrieving the import message source.
 * @param params.provider - The provider of the email import source.
 * @param params.emailId - The ID of the email to retrieve the import source for.
 * @param params.refresh - Whether to refresh the import source data. Defaults to `false`.
 * @param params.returnResponse - Whether to return a response object. Defaults to `true`.
 * @returns A promise that resolves to an `ImportSourceMessage`, `null`, or `NextResponse`.
 *
 * @throws {Error} If the user is not authenticated.
 * @throws {Error} If the provider or emailId is missing when refresh is `true`.
 * @throws {Error} If the user is unauthorized to access the email.
 * @throws {Error} If an error occurs during the process.
 */
export const getImportMessageSource: GetImportMessageSourceOverloads = async ({
  req,
  provider,
  emailId,
  refresh = false,
  errorFilter,
}: {
  req: NextRequest | NextApiRequest;
  provider?: string;
  emailId?: string;
  refresh?: boolean;
  errorFilter?: undefined | ErrorFilter;
}): Promise<(NextResponse & ImportSourceMessage) | null> => {
  const getReturnValue = (
    response: NextResponse | null,
  ): NextResponse & ImportSourceMessage =>
    (!!errorFilter ? response : null) as NextResponse & ImportSourceMessage;
  try {
    let source: GmailEmailImportSource | undefined = undefined;
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      throw new Error('Must be authenticated to call this API', {
        cause: 'unauthorized',
      });
    }
    const userId = Number(session.user.id);
    if (refresh) {
      if (![provider, emailId].every(Boolean)) {
        return getReturnValue(
          NextResponse.json(
            { error: 'missing provider or emailId' },
            { status: 400 },
          ),
        );
      }
      const factoryResponse = await googleProviderFactory(provider as string, {
        req,
      });
      if ('status' in factoryResponse) {
        return getReturnValue(factoryResponse);
      }
      // read from sql
      const { mail } = factoryResponse;
      const googleResponse = await mail.get({
        userId: 'me',
        id: emailId,
      });
      source = googleResponse.data;
    }
    const theCurrentState = await getCurrentState({
      emailId: emailId!,
      source,
      userId,
    });
    if (!theCurrentState) {
      throw new Error('No current state found', { cause: 'email-not-found' });
    }
    return {
      stage: theCurrentState.stage as ImportStage,
      id: theCurrentState.id,
      providerId: theCurrentState.providerId,
      targetId: theCurrentState.targetId,
      userId: theCurrentState.userId,
      raw: theCurrentState.raw,
    } as NextResponse & ImportSourceMessage;
  } catch (error) {
    // Check to see if this was thrown by us, and if so, handle it.
    if (errorFilter) {
      const checkFilter = errorFilter(error);
      if (checkFilter !== undefined) {
        return getReturnValue(checkFilter);
      }
    }
    // If this is a known gmail error rethrow for caller to process
    if (isKnownGmailError(error)) {
      throw error;
    }
    // Otherwise log the error
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'getImportMessageSource',
    });
    /// And rethrow or convert to a response
    if (errorFilter) {
      return getReturnValue(
        NextResponse.json({ error: le.message }, { status: 500 }),
      );
    }
    throw le;
  }
};

const getImportStatusForExternalId = async (
  providerId: string,
): Promise<{ status: ImportStatusType; emailId: string | null }> => {
  let emailId: string | null;
  let status: ImportStatusType;
  const statusRecords = await query(
    (sql) => sql`
          SELECT e.email_id, s.id AS staged_id 
          FROM emails e 
            FULL OUTER JOIN staging_message s 
              ON e.imported_from_id = s.external_id
          WHERE e.imported_from_id=${providerId} OR s.external_id=${providerId};`,
  );
  if (statusRecords.length) {
    const { email_id: recordEmailId, staged_id: recordStagedId } =
      statusRecords[0];
    // Are we currently staged for processing?
    if (recordStagedId) {
      status = 'in-progress';
      emailId = recordEmailId as string | null;
    } else if (recordEmailId) {
      emailId = String(recordEmailId);
      status = 'imported';
    } else {
      // Logically it should not be possible to get here, but just in case...
      emailId = null;
      status = 'pending';
    }
  } else {
    // no match - email is pending import processing
    emailId = null;
    status = 'pending';
  }
  return { status, emailId };
};

const checkReferencedEmailStatus = async ({
  email,
  mail,
}: {
  email: GmailEmailImportSource;
  mail: GmailMessagdApi;
}) => {
  // First search headers for any references to other email id's
  const extractHeaders = (
    payload: GmailEmailMessagePayload | undefined,
  ): ParsedHeaderMap => {
    const headers: Array<GmailEmailMessageHeader> = [];
    const extractHeadersFromPart = (part: GmailEmailMessagePart): void => {
      if (part.headers) {
        headers.push(...part.headers);
      }
      if (part.parts) {
        part.parts.forEach(extractHeadersFromPart);
      }
    };

    if (payload) {
      extractHeadersFromPart(payload);
    }
    return ParsedHeaderMap.fromHeaders(headers, {
      parseContacts: true,
      expandArrays: true,
      extractBrackets: true,
    });
  };

  //const lookFor = ['references', 'in-reply-to'];
  const headerMap = extractHeaders(email.payload);
  // Extract every known message id from headers
  const referencedEmailIds = Array.from(
    new Set([
      ...(headerMap.getAllStringValues('References') ?? []),
      ...(headerMap.getAllStringValues('In-Reply-To') ?? []),
    ]),
  );
  const recipients = Array.from(
    new Set([
      ...(headerMap.getAllContactValues('To') ?? []),
      ...(headerMap.getAllContactValues('Cc') ?? []),
      ...(headerMap.getAllContactValues('Bcc') ?? []),
    ]),
  );
  // Lookup any existing emails matching these ids
  const importedRecordset = new Map<string, string>(
    (
      await query(
        (sql) =>
          sql`select email_id, global_message_id from emails where global_message_id = any(${referencedEmailIds});`,
      )
    ).map((x) => [x.global_message_id as string, x.email_id as string]),
  );
  let parseImported = referencedEmailIds.reduce(
    (acc, id) => {
      const emailId = importedRecordset.get(id);
      if (emailId) {
        acc.processed.push({
          emailId,
          provider: 'google',
          providerId: id,
          status: 'imported',
        });
      } else {
        acc.unsorted.push(id);
      }
      return acc;
    },
    { processed: [], unsorted: [] } as {
      processed: Array<MessageImportStatus>;
      unsorted: Array<string>;
    },
  );
  const operations = await Promise.all(
    parseImported.unsorted.map((id) => {
      const queryBuilder = new MailQueryBuilder();
      queryBuilder.appendMessageId(id);
      return mail
        .list({ q: queryBuilder.build(), userId: 'me' })
        .then((matches) => ({
          status: 'succeeded',
          provider: 'google',
          id: id,
          data: matches?.data?.messages?.at(0),
        }))
        .catch((error) => ({ status: 'failed', id: id, error }));
    }),
  );
  // If we still have unsorted id's, lets try to look them up with the provider
  parseImported = parseImported.unsorted.reduce(
    (acc, id) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = operations.find((o) => o.id === id) as any;
      if (match && match.status === 'succeeded' && match.data) {
        acc.processed.push({
          emailId: id,
          provider: 'google',
          providerId: match!.data!.id!,
          status: 'pending',
        });
      } else {
        acc.unsorted.push(id);
      }
      return acc;
    },
    { processed: parseImported.processed, unsorted: [] } as {
      processed: Array<MessageImportStatus>;
      unsorted: Array<string>;
    },
  );
  // Parse received date
  const date = headerMap.getFirstStringValue('Date');
  const receivedDate = date ? new Date(date) : new Date(0);

  // Return final result
  return {
    processed: parseImported.processed,
    recipients,
    receivedDate,
    subject: headerMap.getFirstStringValue('Subject') ?? '[No Subject]',
    sender: headerMap.getFirstContactValue('From') ?? { email: 'No Sender' },
  };
};

export const getImportMessageStatus = async ({
  provider,
  emailId: emailIdFromProps,
  req,
}: {
  provider: string;
  emailId: string;
  req: NextRequest | NextApiRequest;
}): Promise<MessageImportStatusWithChildren> => {
  try {
    // First off load the email from the provider
    const { email, mail } = await getGmailMessage({
      provider,
      emailId: emailIdFromProps,
      req,
    });
    // Extract the provider id...
    const providerId = email.id!;
    // and use it to query for import state and our system's email id
    const { emailId, status } = await getImportStatusForExternalId(providerId);
    // Finally, scan referenced emails to locate any additional items pending imoprt
    const { processed, recipients, sender, subject, receivedDate } =
      await checkReferencedEmailStatus({ email, mail });
    return {
      emailId,
      providerId,
      provider,
      status,
      recipients,
      sender,
      subject,
      receivedDate,
      references: processed,
    };
  } catch (error) {
    if (isError(error)) {
      if (isKnownGmailErrorCause(error.cause)) {
        // We handle email not found
        if (error.cause === 'email-not-found') {
          return {
            emailId: null,
            providerId: emailIdFromProps,
            provider,
            status: 'not-found',
            sender: { email: 'unknown' },
            recipients: [],
            subject: 'unknown',
            receivedDate: new Date(0),
            references: [],
          };
        }
        // rethrow all other known error types for caller to handle
        throw error;
      }
    }
    // For everything else, log the error and rethrow
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'getImportMessageStatus',
      provider,
      emailId: emailIdFromProps,
    });
  }
};
