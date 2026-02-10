import type { GridSortModel, GridFilterModel } from '@mui/x-data-grid-pro';

/**
 * Type guard to check if a value is a GridSortModel.
 */
export const isGridSortModel = (value: unknown): value is GridSortModel => {
  if (!Array.isArray(value)) {
    return false;
  }
  
  return value.every(item => 
    typeof item === 'object' &&
    item !== null &&
    'field' in item &&
    typeof item.field === 'string' &&
    'sort' in item &&
    (item.sort === 'asc' || item.sort === 'desc' || item.sort === null || item.sort === undefined)
  );
};

/**
 * Type guard to check if a value is a GridFilterModel.
 */
export const isGridFilterModel = (value: unknown): value is GridFilterModel => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    'items' in obj &&
    Array.isArray(obj.items) &&
    obj.items.every(item => 
      typeof item === 'object' &&
      item !== null &&
      'field' in item &&
      typeof item.field === 'string'
    )
  );
};

/**
 * Type guard to check if a value is a string.
 */
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

/**
 * Type guard to check if a value is a URL.
 */
export const isURL = (value: unknown): value is URL => {
  return value instanceof URL;
};