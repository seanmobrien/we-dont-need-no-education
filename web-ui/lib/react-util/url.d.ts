/**
 * @fileoverview URL utility functions for normalizing paths and handling absolute URLs.
 * @module url
 */

declare module 'lib/react-util/url' {
  /**
   * Normalize a path by removing trailing slashes (except root).
   */
  export const normalizePath: (s: string) => string;

  /**
   * Get the last path segment from a pathname, ignoring query/hash.
   */
  export const getLastPathSegment: (pathname?: string) => string | undefined;

  /**
   * Convert a relative URL to an absolute URL using the configured hostname.
   */
  export const makeAbsoluteUrl: (relativeUrl: string) => string;
}
