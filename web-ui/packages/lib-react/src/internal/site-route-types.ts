/**
 * Minimal site route types
 * Copied from site-util to avoid dependency on un-extracted package
 */
import type { Route } from 'next';

// Constrain route-like strings using Next's Route type without depending on internal namespaces.
export type SiteRouteType = string;
export type SiteRoute<T extends SiteRouteType = SiteRouteType> = Route<T>;
