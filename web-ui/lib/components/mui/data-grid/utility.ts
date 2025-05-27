import { GridFilterModel, GridSortModel } from '@mui/x-data-grid-pro';
import { isGridFilterModel, isGridSortModel } from './guards';

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
): GridFilterModel | undefined => {
  if (isGridFilterModel(req)) {
    return req.items.length === 0 ? undefined : req;
  }
  if (req instanceof URL) {
    req = req.searchParams;
  } else if (req instanceof URLSearchParams) {
    // do nothing
  } else {
    return undefined;
  }
  const filterParam = req.get('filter');
  if (!filterParam) return undefined;
  const check = JSON.parse(filterParam);
  if (isGridFilterModel(check)) {
    check.items = check.items.filter((x) => x.field && x.operator && x.value);
    return check.items.length === 0 ? undefined : check;
  }
  return undefined;
};

/**
 * Parses the provided sort options from a URL, URLSearchParams, or GridSortModel.
 *
 * @param req - The source of the sort options, which can be a URL, URLSearchParams, or a GridSortModel (or undefined).
 * @returns The parsed GridSortModel if available, otherwise undefined. If there are no sort options defined, undefined should be returned, not an empty array.
 */
export const parseSortOptions = (
  req: URL | URLSearchParams | (GridSortModel | undefined),
): GridSortModel | undefined => {
  if (!req) return undefined;

  // If already a GridSortModel, return as is
  if (isGridSortModel(req)) {
    return req.length === 0 ? undefined : req;
  }

  // If URL, get search params
  let params: URLSearchParams;
  if (req instanceof URL) {
    params = req.searchParams;
  } else if (req instanceof URLSearchParams) {
    params = req;
  } else {
    return undefined;
  }

  const sortParam = params.get('sort');
  if (sortParam == null) return undefined;
  if (sortParam === '') return undefined;

  // sort=field1:asc,field2:desc
  // Edge case: preserve spaces, handle multiple colons as multiple fields (split on colon, each segment is a field except the last if it's a valid direction)
  return sortParam.split(',').flatMap((entry) => {
    const segments = entry.split(':');
    if (segments.length === 1) {
      return [{ field: segments[0], sort: 'asc' as 'asc' | 'desc' }];
    }
    if (segments.length === 2) {
      const [field, sort] = segments;
      return [{ field, sort: sort && sort.trim() === 'desc' ? 'desc' : 'asc' }];
    }
    // If more than 2 segments, treat each as a field with default 'asc', except the last if it's a valid direction
    const last = segments[segments.length - 1];
    const isDirection = last && last.trim() === 'desc';
    const fields = isDirection ? segments.slice(0, -1) : segments;
    return fields.map((field) => ({ field, sort: 'asc' as 'asc' | 'desc' }));
  });
};

export const columnMapFactory = (
  columnMap: Record<string, string> | ((input: string) => string) | undefined,
): ((input: string) => string) => {
  if (!columnMap) {
    return (s: string) => s; // Default to identity function
  }
  if (typeof columnMap === 'function') {
    return columnMap; // Already a function
  }
  return (s: string) => columnMap[s] || s;
};

export const DefaultEmailColumnMap = {
  value: 'property_value',
  typeName: 'property_name',
};
