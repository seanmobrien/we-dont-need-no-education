import type { Route } from 'next';

// Constrain route-like strings using Next's Route type without depending on internal namespaces.
export type SiteRouteType = string;
export type SiteRoute<T extends SiteRouteType = SiteRouteType> = Route<T>;

export interface PageOverloads {
  (page: string, slug: string | number, params?: object): URL;
  (page: string | number, params?: object): URL;
  (params: object): URL;
  (): URL;
}

export interface MappedPageOverloads {
  <T extends SiteRouteType = SiteRouteType>(
    slug: string | number,
    params?: object,
  ): SiteRoute<T>;
  <T extends SiteRouteType = SiteRouteType>(params: object): SiteRoute<T>;
  <T extends SiteRouteType = SiteRouteType>(): SiteRoute<T>;
}

export type IUrlBuilder = {
  get parent(): IUrlBuilder | null;
  get segment(): string;
  get slug(): string | number | undefined;
  get path(): string;
  get url(): URL;
  child: (segment: string, slug?: string | number) => IUrlBuilder;
  page: PageOverloads;
  route: MappedPageOverloads;
  toString: () => string;
};

export type UrlBuilderInfo = {
  readonly parent: IUrlBuilder;
  readonly segment: string;
  readonly slug?: string | number;
};

export type UrlMap = Record<string, string | Record<string, unknown>>;
