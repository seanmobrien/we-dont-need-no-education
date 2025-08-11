import { GridFilterModel, GridFilterItem } from '@mui/x-data-grid-pro';
import { ISqlNeonAdapter, isSqlNeonAdapter, SqlDb, unwrapAdapter } from '@/lib/neondb';
import { isLikeNextRequest, LikeNextRequest } from '@/lib/nextjs-util';
import { columnMapFactory } from '../utility';
import { BuildQueryFilterProps, BuildItemFilterProps } from './types';
import { isGridFilterModel } from './guards';
import { isTruthy } from '@/lib/react-util';

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
    : sqlFromProps as SqlDb<Record<string, unknown>>;
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


/**
 * Build a single filter condition for an item
 */
export const buildItemFilter = ({ item, columnMap = {} }: BuildItemFilterProps): string => {
  const mapColumn = columnMapFactory(columnMap);
  const column = mapColumn(item.field);
  
  switch (item.operator) {
    case 'contains':
      return `${column} ILIKE '%${item.value}%'`;
    case 'equals':
      return `${column} = '${item.value}'`;
    case 'startsWith':
      return `${column} ILIKE '${item.value}%'`;
    case 'endsWith':
      return `${column} ILIKE '%${item.value}'`;
    case 'isEmpty':
      return `${column} IS NULL OR ${column} = ''`;
    case 'isNotEmpty':
      return `${column} IS NOT NULL AND ${column} != ''`;
    case 'isAnyOf':
      if (Array.isArray(item.value)) {
        const values = item.value.map(v => `'${v}'`).join(', ');
        return `${column} IN (${values})`;
      }
      return `${column} = '${item.value}'`;
    default:
      return `${column} = '${item.value}'`;
  }
};

/**
 * Build query filter for PostgreSQL
 */
export const buildQueryFilter = <RecordType extends Record<string, unknown> = Record<string, unknown>>({
  sql: sqlFromProps,
  source,
  defaultFilter,
  columnMap = {},
  additional = {},
  append = false
}: BuildQueryFilterProps<RecordType>) => {
  const sql = isSqlNeonAdapter(sqlFromProps) 
    ? unwrapAdapter<RecordType>(sqlFromProps) 
    : sqlFromProps as SqlDb<RecordType>;

  // Parse filter model from source
  let filterModel: GridFilterModel | null = null;
  
  if (!source && defaultFilter) {
    source = defaultFilter;
  }

  if (!source) {
    return sql``;
  }

  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      if (isGridFilterModel(parsed)) {
        filterModel = parsed;
      }
    } catch {
      return sql``;
    }
  } else if (source instanceof URL) {
    const filterParam = source.searchParams.get('filter');
    if (filterParam && filterParam.trim()) {
      try {
        const parsed = JSON.parse(filterParam);
        if (isGridFilterModel(parsed)) {
          filterModel = parsed;
        }
      } catch {
        return sql``;
      }
    }
  } else if (source && isLikeNextRequest(source) && source.url) {
    const url = new URL(source.url);
    const filterParam = url.searchParams.get('filter');
    if (filterParam && filterParam.trim()) {
      try {
        const parsed = JSON.parse(filterParam);
        if (isGridFilterModel(parsed)) {
          filterModel = parsed;
        }
      } catch {
        return sql``;
      }
    }
  } else if (isGridFilterModel(source)) {
    filterModel = source;
  }

  if (!filterModel || !filterModel.items || filterModel.items.length === 0) {
    return sql``;
  }

  // Build filter conditions
  const conditions: string[] = [];
  
  // Add main filter items
  for (const item of filterModel.items) {
    const condition = buildItemFilter({ item, columnMap });
    if (condition) {
      conditions.push(condition);
    }
  }

  // Add additional filters
  for (const [field, itemProps] of Object.entries(additional)) {
    const item: GridFilterItem = { field, ...itemProps };
    const condition = buildItemFilter({ item, columnMap });
    if (condition) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) {
    return sql``;
  }

  // Combine conditions based on linkOperator
  const filterWithLinkOperator: GridFilterModel & { linkOperator?: 'and' | 'or' } = filterModel;
  const linkOperator = (filterWithLinkOperator.linkOperator ?? 'and').toLocaleLowerCase();
  const operator = linkOperator === 'or' ? ' OR ' : ' AND ';
  
  return sql(`${append ? 'AND ' : 'WHERE '} (${conditions.join(operator)})`);
};