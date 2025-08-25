/**
 * Normalize a path by removing trailing slashes (except root).
 */
export const normalizePath = (s: string): string =>
  s.endsWith('/') && s !== '/' ? s.replace(/\/+$/, '') : s;

/**
 * Get the last path segment from a pathname, ignoring query/hash.
 */
export const getLastPathSegment = (pathname?: string): string | undefined => {
  if (!pathname) return undefined;
  const withoutQuery = pathname.split('?')[0].split('#')[0];
  const parts = withoutQuery.split('/').filter(Boolean);
  return parts[parts.length - 1];
};
