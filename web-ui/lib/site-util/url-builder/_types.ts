export interface PageOverloads {
  (page: string, slug: string | number, params?: object): URL;
  (page: string | number, params?: object): URL;
  (params: object): URL;
  (): URL;
}

export interface MappedPageOverloads {
  (slug: string | number, params?: object): URL;
  (params: object): URL;
  (): URL;
}

export type IUrlBuilder = {
  get parent(): IUrlBuilder | null;
  get segment(): string;
  get slug(): string | number | undefined;
  get path(): string;
  get url(): URL;
  child: (segment: string, slug?: string | number) => IUrlBuilder;
  page: PageOverloads;
  toString: () => string;
};

export type UrlBuilderInfo = {
  readonly parent: IUrlBuilder;
  readonly segment: string;
  readonly slug?: string | number;
};

export type UrlMap = Record<string, string | Record<string, unknown>>;
