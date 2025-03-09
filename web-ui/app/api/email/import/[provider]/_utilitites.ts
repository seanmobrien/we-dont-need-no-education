import { normalizeNullableNumeric, PaginationStats } from '@/data-models';
import {
  GmailEmailImportSource,
  ImportSourceMessage,
  ImportStage,
  ImportMessageStatus,
} from '@/data-models/api/import/email-message';
import { query } from '@/lib/neondb';
import { NextResponse } from 'next/server';
import { googleProviderFactory } from './_googleProviderFactory';
import { errorLogFactory, log } from '@/lib/logger';
import { isError, LoggedError } from '@/lib/react-util';
import { auth } from '@/auth';

/**
 * A class to build mail query strings for a specific provider.
 *
 * @class
 * @example
 * const builder = new MailQueryBuilder();
 * builder.appendQueryParam('from', 'example@example.com');
 * const query = builder.build(); // 'from:example@example.com'
 */
export class MailQueryBuilder {
  #query: string;

  constructor() {
    this.#query = '';
  }

  /**
   * Checks if the query has any elements.
   *
   * @returns {boolean} `true` if the query has one or more elements, otherwise `false`.
   */
  get hasQuery(): boolean {
    return this.#query.length > 0;
  }

  /**
   * Appends a query parameter to the existing query string.
   *
   * @param queryKey - The key of the query parameter to append.
   * @param input - The value(s) of the query parameter. Can be a string or an array of strings.
   * @returns The current instance of `MailQueryBuilder` for method chaining.
   */
  appendQueryParam(
    queryKey: string,
    input: string | string[]
  ): MailQueryBuilder {
    const data = (Array.isArray(input) ? input : [input])
      .map((item) => item?.trim() ?? '')
      .filter(Boolean);
    if (data.length > 0) {
      this.#query += `${queryKey}:${data.join(` ${queryKey}:`)} `;
    }
    return this;
  }

  /**
   * Builds and returns the query string if it exists.
   *
   * @returns {string | undefined} The trimmed query string if it exists, otherwise undefined.
   */
  build(): string | undefined {
    return this.hasQuery ? this.#query.trim() : undefined;
  }
}

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
  req: URL | URLSearchParams
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
          select s.external_id AS providerId, s.stage, s.id${messageField}, s."userId", m.email_id AS targetId from emails m 
            right join staging_message s on s.external_id = m.imported_from_id
            where s.external_id = $1;`.toString(),
      [emailId]
    )
  );
  if (!currentStateRows.length) {
    const existingEmailRows = await query(
      (sql) =>
        sql`select email_id from emails where imported_from_id = ${emailId};`
    );
    if (existingEmailRows.length) {
      throw new Error(
        `Gmail Message ${emailId} has already been imported as email ${existingEmailRows[0].email_id}; manually delete the email if you want to re-import it.`,
        { cause: 'email-exists' }
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
export const getImportMessageSource = async ({
  provider,
  emailId,
  refresh = false,
  returnResponse = true,
}: {
  provider?: string;
  emailId?: string;
  refresh?: boolean;
  returnResponse?: boolean;
}): Promise<ImportSourceMessage | null | NextResponse> => {
  const getReturnValue = (response: NextResponse): null | NextResponse =>
    returnResponse === false ? null : response;
  try {
    let source: GmailEmailImportSource | undefined = undefined;
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      throw new Error('Must be authenticated to call this API');
    }
    const userId = Number(session.user.id);
    if (refresh) {
      if (![provider, emailId].every(Boolean)) {
        return getReturnValue(
          NextResponse.json(
            { error: 'missing provider or emailId' },
            { status: 400 }
          )
        );
      }
      const factoryResponse = await googleProviderFactory(provider as string);
      if ('status' in factoryResponse) {
        return factoryResponse;
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
      throw new Error('No current state found', { cause: 'source-not-found' });
    }
    return {
      stage: theCurrentState.stage as ImportStage,
      id: theCurrentState.id,
      providerId: theCurrentState.providerId,
      targetId: theCurrentState.targetId,
      userId: theCurrentState.userId,
      raw: theCurrentState.raw,
    };
  } catch (error) {
    // Check to see if this was thrown by us, and if so, handle it.
    if (isError(error)) {
      switch (error.cause) {
        case 'unauthorized':
          return getReturnValue(
            NextResponse.json({ error: 'unauthorized' }, { status: 401 })
          );
        case 'email-exists':
          return getReturnValue(
            NextResponse.json({ error: 'email-exists' }, { status: 409 })
          );
        case 'source-not-found':
          return getReturnValue(
            NextResponse.json({ error: 'source-not-found' }, { status: 404 })
          );
        default:
          // Otherwise this is an error-error.  Write to log
          break;
      }
    }
    log((l) =>
      l.error(
        errorLogFactory({
          error,
          source: 'google-email-import',
          provider,
          emailId,
        })
      )
    );
    if (returnResponse === false) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error);
    }
  }
  return NextResponse.json({ error: 'error' }, { status: 500 });
};

export const getImportMessageStatus = async ({
  provider,
  emailId,
}: {
  provider: string;
  emailId: string;
}): Promise<ImportMessageStatus> => {
  return Promise.resolve({
    emailId: null,
    providerId: emailId,
    provider,
    status: 'not-found',
    ref: [],
  });
};
