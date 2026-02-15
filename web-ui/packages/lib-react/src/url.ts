import { env } from '@compliance-theater/env';
import { SiteRoute, SiteRouteType } from './internal/site-route-types';
import { UrlObject } from 'url';

/**
 * Normalize a path by removing trailing slashes (except root).
 */
export const normalizePath = <TRouteType extends SiteRouteType = SiteRouteType>(
  path: string | SiteRoute<TRouteType> | UrlObject,
): SiteRoute<TRouteType> => {
  const s = String(path);
  return (
    s.endsWith('/') && s !== '/' ? s.replace(/\/+$/, '') : s
  ) as SiteRoute<TRouteType>;
};

/**
 * Get the last path segment from a pathname, ignoring query/hash.
 */
export const getLastPathSegment = (
  pathname?: string | SiteRoute | UrlObject,
): string | undefined => {
  if (!pathname) return undefined;
  const withoutQuery = String(pathname).split('?')[0].split('#')[0];
  const parts = withoutQuery.split('/').filter(Boolean);
  return parts[parts.length - 1];
};
export const makeAbsoluteUrl = (
  relativeUrl: string | SiteRoute | UrlObject,
): string => {
  if (!relativeUrl) return '';
  return new URL(
    String(relativeUrl),
    new URL(env('NEXT_PUBLIC_HOSTNAME')),
  ).toString();
};
