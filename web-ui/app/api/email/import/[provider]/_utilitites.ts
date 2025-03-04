import { normalizeNullableNumeric, PaginationStats } from '@/data-models';
import {
  GmailEmailImportSource,
  ImportSourceMessage,
  ImportStage,
} from '@/data-models/api/import/email-message';
import { query } from '@/lib/neondb';
import { NextResponse } from 'next/server';
import { googleProviderFactory } from './_googleProviderFactory';
import { errorLogFactory, log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';

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
    let source: GmailEmailImportSource | undefined;
    let currentState: {
      stage: ImportStage;
      id: string;
      providerid: string;
      targetid: string;
      message?: string;
    }[] = [];
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
      currentState = await query(
        (
          sql
        ) => sql`select s.external_id AS providerId, s.stage, s.id, m.email_id AS targetId from emails m 
        right join staging_message s on s.external_id = m.imported_from_id
        where s.external_id = ${emailId}`
      );
    } else {
      currentState = await query(
        (
          sql
        ) => sql`select s.external_id AS providerId, s.stage, s.id, to_json(s.message) AS message, m.email_id AS targetId from emails m 
            right join staging_message s on s.external_id = m.imported_from_id
            where s.external_id = ${emailId}`
      );
      source =
        currentState.length && currentState[0].message
          ? (currentState[0].message as GmailEmailImportSource)
          : undefined;
    }
    if (!currentState.length) {
      return source
        ? { raw: source, stage: 'new', providerId: emailId! }
        : getReturnValue(
            NextResponse.json({ error: 'email not found' }, { status: 404 })
          );
    }
    if (!source) {
      return getReturnValue(
        NextResponse.json({ error: 'email not found' }, { status: 404 })
      );
    }
    return {
      stage: currentState[0].stage as ImportStage,
      id: currentState[0].id,
      providerId: currentState[0].providerid,
      targetId: currentState[0].targetid,
      raw: source,
    };
  } catch (error) {
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
