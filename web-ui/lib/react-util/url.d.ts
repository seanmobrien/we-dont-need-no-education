/**
 * @fileoverview URL utility functions for normalizing paths and handling absolute URLs.
 * @module url
 */

declare module 'lib/react-util/url' {
  /**
   * Normalize a path by removing trailing slashes (except root).
   */
  export function normalizePath(s: string): string;

  /**
   * Get the last path segment from a pathname, ignoring query/hash.
   */
  export function getLastPathSegment(pathname?: string): string | undefined;

  /**
   * Convert a relative URL to an absolute URL using the configured hostname.
   */
  export function makeAbsoluteUrl(relativeUrl: string): string;
}
