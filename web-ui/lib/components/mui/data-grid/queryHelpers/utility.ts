import type { LikeNextRequest } from '@/lib/nextjs-util';
import type { GridFilterModel, GridSortModel, GridFilterItem } from '@mui/x-data-grid-pro';
import { isLikeNextRequest } from '@/lib/nextjs-util';
import { isGridSortModel, isString, isURL } from './postgres/guards';
import { isGridFilterModel } from '../guards';
import { ArrayElement } from '@/lib/typescript';
import { PaginatedGridListRequest } from '../types';
import { normalizeNullableNumeric } from '@/data-models';
type GridSortItem = ArrayElement<GridSortModel>;

/**
 * Parses filter options from various input types and returns a `GridFilterModel` if available.
 *
 * Accepts a `URL`, `URLSearchParams`, or a `GridFilterModel` (or `undefined`), and attempts to extract
 * a valid `GridFilterModel` from the input. If the input is a `URL`, it uses its `searchParams`.
 * If the input is a `URLSearchParams`, it looks for a `filter` parameter and parses it as JSON.
 * If the parsed object is a valid `GridFilterModel` and contains items, it is returned.
 * Returns `undefined` if no valid filter model is found or if the filter model has no items.
 *
 * @param req - The request input, which can be a `URL`, `URLSearchParams`, or a `GridFilterModel` (or `undefined`).
 * @returns The parsed `GridFilterModel` if valid and contains items, otherwise `undefined`.
 */
export const parseFilterOptions = (
  req: URL | URLSearchParams | (GridFilterModel | undefined),
  additional?: Record<string, Omit<GridFilterItem, 'field'>>,
): GridFilterModel | undefined => {
  const appendAdditional = (
    x: GridFilterModel,
  ): GridFilterModel | undefined => {
    const addKeys = Object.keys(additional ?? {});
    return x.items.length === 0
      ? addKeys.length > 0
        ? {
            ...x,
            items: addKeys.map((key) => ({ field: key, ...additional![key] })),
          }
        : undefined
      : addKeys.length > 0
        ? {
            ...x,
            items: [
              ...(x.items || []),
              ...addKeys.map((key) => ({ field: key, ...additional![key] })),
            ],
          }
        : x;
  };

  if (isGridFilterModel(req)) {
    return appendAdditional(req);
  }
  if (req instanceof URL) {
    req = req.searchParams;
  } else if (req instanceof URLSearchParams) {
    // do nothing
  } else {
    return undefined;
  }
  const filterParam = req.get('filter');
  if (!filterParam) return appendAdditional({ items: [] });
  const check = JSON.parse(filterParam);
  if (isGridFilterModel(check)) {
    check.items = check.items.filter((x) => x.field && x.operator && x.value);
    return appendAdditional(check);
  }
  return appendAdditional({ items: [] });
};


/**
 * Factory function to create a column mapping function.
 */
export const columnMapFactory = (
  columnMap: ((sourceColumnName: string) => string) | Record<string, string>
): ((sourceColumnName: string) => string) => {
  if (typeof columnMap === 'function') {
    return columnMap;
  }
  
  return (sourceColumnName: string) => columnMap[sourceColumnName] || sourceColumnName;
};


type ParseSortOptionsParam =
  | URLSearchParams
  | LikeNextRequest
  | URL
  | string
  | GridSortModel;

/**
 * Parse sort options from various sources.
 */
export const parseSortOptions = (
  source?: ParseSortOptionsParam,
): typeof source extends infer TSource ? TSource extends ParseSortOptionsParam ? GridSortModel : undefined : never => {  
  if (source === null) {
    return [] as GridSortModel; // Test expects [] for null
  }
  
  if (source === undefined) {
    return undefined as undefined; // Test expects undefined for undefined
  }

  if (isGridSortModel(source)) {
    return source;
  }

  if (isString(source)) {
    // Handle empty string case
    if (source.trim() === '') {
      return undefined as undefined;
    }
    
    try {
      const parsed = JSON.parse(source);
      if (isGridSortModel(parsed)) {
        return parsed;
      }
    } catch {
      // If parsing as json fails, try [field]:asc|desc format
      const extracted = source.split(',').reduce((acc, item) => {
        if (!item.trim()) return acc; // Skip empty items
        
        // Split only on the first colon to handle cases like 'foo:bar:desc'
        const colonIndex = item.indexOf(':');
        if (colonIndex === -1) {
          // No colon found, use default sort
          acc.push({ 
            field: item.trim(), 
            sort: 'asc' as 'asc' | 'desc'
          });
        } else {
          const field = item.substring(0, colonIndex);
          const direction = item.substring(colonIndex + 1).trim();
          acc.push({ 
            field: field, // Preserve spaces in field name per test
            sort: (direction.toLowerCase() === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc'
          });
        }
        return acc;
      }, [] as GridSortItem[]);
      
      if (extracted.length > 0) {
        return extracted as GridSortModel;
      }
    }
    return undefined as undefined; // Return undefined for invalid strings
  }

  if (source instanceof URLSearchParams) {
    const sortParam = source.get('sort');
    return sortParam
      ? parseSortOptions(sortParam)
      : undefined;
  }

  if (isURL(source)) {
    return parseSortOptions(source.searchParams);
  }

  if (source && isLikeNextRequest(source) && source.url) {
    const url = new URL(source.url);
    return parseSortOptions(url.searchParams);
  }

  // For unknown types (objects, numbers, etc.)
  return undefined as undefined;
};

/**
 * Parse pagination options from various sources.
 */
export const parsePaginationOptions = (
  source: LikeNextRequest | URL | string | undefined,
  defaultPageSize: number = 25,
  maxPageSize: number = 100
): { offset: number; limit: number } | { num: number; page: string; } => {
  let page = 0;
  let pageSize = defaultPageSize;

  if (!source) {
    return { offset: 0, limit: pageSize };
  }

  let searchParams: URLSearchParams | undefined;

  if (source && isString(source)) {
    try {
      const url = new URL(source);
      searchParams = url.searchParams;
    } catch {
      // If URL parsing fails, use defaults
    }
  } else if (source && isURL(source)) {
    searchParams = source.searchParams;
  } else if (source && isLikeNextRequest(source) && source.url) {
    const url = new URL(source.url);
    searchParams = url.searchParams;
  } else if (source instanceof URLSearchParams) {
    searchParams = source;
  }

  if (searchParams) {
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');
        
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage >= 0) {
        page = parsedPage;
      }
    }

    if (pageSizeParam) {
      const parsedPageSize = parseInt(pageSizeParam, 10);
      if (!isNaN(parsedPageSize) && parsedPageSize > 0) {
        pageSize = Math.min(parsedPageSize, maxPageSize);
      }
    } else {
      const numParam = searchParams.get('num');
      if (numParam !== null) {
        const numValue = parseInt(numParam, 10);
        return {
          num:
            isNaN(numValue) || numValue < 1
              ? 100
              : Math.min(numValue, maxPageSize),
          page: (pageParam ?? '').trim(),
        };
      }      
    }
  }

  const offset = page * pageSize;
  return { offset, limit: pageSize };
};


/**
 * Parses pagination statistics from a given request object.
 *
 * @param req - The request object which can be of type URL, URLSearchParams, or PaginationStats.
 * @returns An object containing pagination statistics including page, num, total, and offset.
 *
 * The function extracts the `page` and `num` parameters from the request object.
 * If the request object is of type URL or URLSearchParams, it retrieves these parameters from the search parameters.
 * If the request object is of type PaginationStats, it directly uses the `page` and `num` properties.
 * If the request object is undefined or null, it defaults to page 1 and num 10.
 *
 * The `page` and `num` values are normalized to ensure they are numeric and fall back to default values if necessary.
 * The `offset` is calculated based on the `page` and `num` values.
 *
 * @example
 * ```typescript
 * const url = new URL('https://example.com?page=2&num=20');
 * const stats = parsePaginationStats(url);
 * console.log(stats); // { page: 2, num: 20, total: 0, offset: 20 }
 * ```
 */
export const parsePaginationStats = (
  req:
    | URL
    | URLSearchParams
    | (PaginatedGridListRequest | undefined)
    | LikeNextRequest,
): PaginatedGridListRequest & { offset: number } => {
  let page: number | string | undefined | null;
  let num: number | string | undefined | null;
  let filter: GridFilterModel | undefined;
  let sort: GridSortModel | undefined;
  if (isLikeNextRequest(req)) {
    req = new URL(req.url!);
  }
  if (!!req && ('searchParams' in req || 'get' in req)) {
    if ('searchParams' in req) {
      req = req.searchParams;
    }
    page = req.get('page');
    num = req.get('num');
    filter = parseFilterOptions(req);
    sort = parseSortOptions(req);
  } else {
    if (!req) {
      page = undefined;
      num = undefined;
      filter = undefined;
      sort = undefined;
    } else {
      page = req.page;
      num = req.num;
      filter = req.filter;
      sort = req.sort;
    }
  }
  page = normalizeNullableNumeric(Number(page), 1) ?? 1;
  num = normalizeNullableNumeric(Number(num), 10) ?? 10;
  return {
    filter,
    sort,
    page,
    num,
    total: 0,
    offset: (page - 1) * num,
  };
};