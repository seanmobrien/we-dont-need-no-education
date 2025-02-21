/**
 * @module _utilities
 *
 * This module provides utility functions for data normalization.
 */

import { URLSearchParams } from 'url';
import { PaginationStats } from './_types';

/**
 * Normalizes a nullable numeric value.
 *
 * If the provided value is null or less than or equal to zero, it returns null.
 * Otherwise, it returns the original value.
 *
 * @param value - The numeric value to normalize, which can be null.
 * @returns The normalized numeric value or null.
 */
export const normalizeNullableNumeric = (
  value: number | null,
  defaultValue: number | null = null,
  minValue: number = 1
): number | null => ((value ?? 0) > minValue - 1 ? value : defaultValue);

export const parsePaginationStats = (
  req: URL | URLSearchParams
): PaginationStats & { offset: number } => {
  if ('searchParams' in req) {
    req = req.searchParams;
  }
  const page = normalizeNullableNumeric(Number(req.get('page')), 1) ?? 1;
  const num = normalizeNullableNumeric(Number(req.get('num')), 10) ?? 10;

  return {
    page,
    num,
    total: 0,
    offset: (page - 1) * num,
  };
};

export const normalizeDateAndTime = (
  input: string | Date,
  defaultValue?: Date
) => {
  let date: Date;
  try {
    date = new Date(input);
    if (isNaN(date.valueOf())) {
      date = defaultValue ?? new Date();
    }
  } catch {
    date = defaultValue ?? new Date();
  }
  return date.toISOString().slice(0, 16);
};
