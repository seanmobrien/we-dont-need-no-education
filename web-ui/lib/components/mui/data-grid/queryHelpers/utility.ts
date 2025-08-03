import type { LikeNextRequest } from '@/lib/nextjs-util';
import type { GridFilterModel, GridSortModel, GridFilterItem } from '@mui/x-data-grid-pro';
import { isLikeNextRequest } from '@/lib/nextjs-util';
import { isGridSortModel, isString, isURL } from './postgres/guards';
import { isGridFilterModel } from '../guards';
import { ArrayElement } from '@/lib/typescript';

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
): { offset: number; limit: number } => {
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
    }
  }

  const offset = page * pageSize;
  return { offset, limit: pageSize };
};