import {
  ISqlNeonAdapter,
  isSqlNeonAdapter,
  SqlDb,
  unwrapAdapter,
} from '@/lib/neondb';
import { isLikeNextRequest, LikeNextRequest } from '@/lib/nextjs-util';
import { columnMapFactory, parseFilterOptions } from './utility';
import { isTruthy } from '@/lib/react-util';
import { BuildQueryFilterProps } from './types';
import { GridFilterItem } from '@mui/x-data-grid-pro';

export const buildAttachmentOrEmailFilter = ({
  attachments,
  email_id,
  email_id_column = 'email_id',
  email_id_table = '', // default to empty string for test compatibility
  document_id_column = 'unit_id',
  document_id_table = '', // default to empty string for test compatibility
  sql: sqlFromProps,
  append = false,
}: {
  /**
   * Value used to determine if the filter should include attachments or target only the email.
   * If true, the filter will include attachments; if false, it will target only the email.
   * This value is typically derived from the request URL or query parameters.
   * If not provided, the filter will default to including attachments.
   */
  attachments: boolean | LikeNextRequest | URL | URLSearchParams | undefined;
  /**
   * The email ID to be used in the filter.
   */
  email_id: string | undefined;
  /**
   * Name of the email id column; defaults to `email_id`.
   */
  email_id_column?: string;
  /**
   * Name of the email id table; defaults to `du` (document_units).
   */
  email_id_table?: string;
  /**
   * Name of the document id column; defaults to `unit_id`.
   */
  document_id_column?: string;
  /**
   * Name of the document id table; defaults to `du` (document_units).
   */
  document_id_table?: string;
  /**
   * The SQL adapter or database instance used to build and execute the query.
   */
  sql: ISqlNeonAdapter | SqlDb<Record<string, unknown>>;
  /**
   * If true, the filter will be appended to the existing filter - eg and AND keyword will be used.
   * If false or not provided, the filter will create a new filter - eg the WHERE keyword will be used.
   */
  append?: boolean;
}) => {
  const sql = isSqlNeonAdapter(sqlFromProps)
    ? unwrapAdapter(sqlFromProps)
    : sqlFromProps;
  let includeAttachments = true;
  if (typeof attachments === 'boolean') {
    includeAttachments = attachments;
  } else if (typeof attachments === 'object' && attachments !== null) {
    let searchParams: URLSearchParams;
    if (attachments instanceof URL) {
      searchParams = attachments.searchParams;
    } else if (attachments instanceof URLSearchParams) {
      searchParams = attachments;
    } else if (isLikeNextRequest(attachments)) {
      searchParams = new URL(attachments.url!).searchParams;
    } else {
      throw new Error('Invalid attachments parameter', { cause: attachments });
    }
    includeAttachments =
      searchParams.has('attachments') &&
      isTruthy(searchParams.get('attachments'));
  }

  const conjunction = append === true ? sql`AND` : sql`WHERE`;

  if (includeAttachments) {
    // If email_id_table is empty, just use the column
    return email_id_table === ''
      ? sql`${conjunction} ${sql(email_id_column)} = ${email_id}`
      : sql`${conjunction} ${sql(email_id_table)}.${sql(email_id_column)} = ${email_id}`;
  }
  // If document_id_table is empty, just use the column
  if (!document_id_table) {
    return sql`${conjunction} email_to_document_id(${email_id}) = ${sql(document_id_column)} `;
  }
  return sql`${conjunction} email_to_document_id(${email_id}) = ${sql(document_id_table)}.${sql(document_id_column)} `;
};

export const buildItemFilter = ({
  item,
  sql,
  columnMap,
}: {
  item: GridFilterItem;
  sql: SqlDb<Record<string, unknown>>;
  columnMap: (input: string) => string;
}) => {
  const mappedField = columnMap(item.field);
  switch (item.operator) {
    case 'equals':
      return sql`${sql(mappedField)} = ${item.value}`;
    case 'notEquals':
      return sql`${sql(mappedField)} != ${item.value}`;
    case 'contains':
      return sql`${sql(mappedField)} ILIKE '%' || ${item.value} || '%'`;
    case 'notContains':
      return sql`${sql(mappedField)} NOT ILIKE '%' || ${item.value} || '%'`;
    case 'startsWith':
      return sql`${sql(mappedField)} ILIKE ${item.value} || '%'`;
    case 'endsWith':
      return sql`${sql(mappedField)} ILIKE '%' || ${item.value}`;
    case 'isEmpty':
      return sql`${sql(mappedField)} IS NULL OR ${sql(mappedField)} = ''`;
    case 'isNotEmpty':
      return sql`${sql(mappedField)} IS NOT NULL AND ${sql(mappedField)} != ''`;
    case 'isAnyOf':
      return sql`${sql(mappedField)} IN (${item.value.map((v: unknown) => sql`${v}`)})`;
    case 'isNoneOf':
      return sql`${sql(mappedField)} NOT IN (${item.value.map((v: unknown) => sql`${v}`)})`;
    case 'isGreaterThan':
      return sql`${sql(mappedField)} > ${item.value}`;
    case 'isLessThan':
      return sql`${sql(mappedField)} < ${item.value}`;
    case 'isGreaterThanOrEqual':
      return sql`${sql(mappedField)} >= ${item.value}`;
    case 'isLessThanOrEqual':
      return sql`${sql(mappedField)} <= ${item.value}`;
    case 'isBetween':
      return sql`${sql(mappedField)} BETWEEN ${item.value[0]} AND ${item.value[1]}`;
    case 'isNotBetween':
      return sql`${sql(mappedField)} NOT BETWEEN ${item.value[0]} AND ${item.value[1]}`;
    case 'isNull':
      return sql`${sql(mappedField)} IS NULL`;
    case 'isNotNull':
      return sql`${sql(mappedField)} IS NOT NULL`;
    case 'in':
      return sql`ANY${sql(mappedField)}) = ${sql`${item.value}`}`;
    default:
      throw new Error(`Unsupported operator: ${item.operator}`, {
        cause: item,
      });
  }
};

export const buildQueryFilter = ({
  sql: sqlFromProps,
  source,
  defaultFilter,
  append = false,
  columnMap: columnMapFromProps = {},
  additional,
}: BuildQueryFilterProps) => {
  const sql = isSqlNeonAdapter(sqlFromProps)
    ? unwrapAdapter(sqlFromProps)
    : sqlFromProps;
  const conjunction = append === true ? sql`AND` : sql`WHERE`;

  if (isLikeNextRequest(source)) {
    const thisUrl = new URL(source.url!);
    source = parseFilterOptions(thisUrl.searchParams, additional);
  }
  if (source === undefined) {
    if (defaultFilter === undefined) {
      return sql``;
    }
    if (isLikeNextRequest(defaultFilter)) {
      const thisUrl = new URL(defaultFilter.url!);
      source = parseFilterOptions(thisUrl.searchParams, additional);
    } else {
      source = defaultFilter;
    }
  }
  if (
    source === undefined ||
    source.items === undefined ||
    source.items.length === 0
  ) {
    return sql``;
  }
  const columnMap = columnMapFactory(columnMapFromProps);
  // The sql template tag may return a string or undefined in the test mock, so always coerce to string
  const result = source.items.reduce((acc, x, i) => {
    const filter = buildItemFilter({ item: x, sql, columnMap });
    return i === 0 ? sql`${acc} ${filter}` : sql`${acc} AND ${filter}`;
  }, conjunction);
  return result || sql``;
};
