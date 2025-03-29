/**
 * Builds a URL relative to this instance given a page segment, slug value, and query paramters.
 *
 * @overload
 * @param {string} page - Relative page segment appended to the URL.
 * @param {string | number} slug - The slug or identifier included in the URL.
 * @param {object} [params] - Optional object containing URL query paremeters..
 * @returns {URL} - The constructed URL.
 *
 * @overload
 * @param {string | number} slug - The slug or identifier included in the URL.
 * @param {object} [params] - Optional object containing URL query paremeters.
 * @returns {URL} - The constructed URL.
 *
 * @overload
 * @param {object} params - Optional object containing URL query paremeters.
 * @returns {URL} - The constructed URL.
 *
 * @overload
 * @returns {URL} - The builder URL - essentially the same as accessing the url property.
 */
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

/**
 * Interface representing a URL builder.
 */
export type IUrlBuilder = {
  /**
   * Gets the parent URL builder.
   */
  get parent(): IUrlBuilder | null;

  /**
   * Gets the current URL segment.
   */
  get segment(): string;

  /**
   * Gets the slug for the current URL segment.
   * Can be a string, number, or undefined.
   */
  get slug(): string | number | undefined;

  /**
   * Gets the full path of the URL.
   */
  get path(): string;

  /**
   * Gets the URL object.
   */
  get url(): URL;

  /**
   * Creates a child URL builder with the specified segment and optional slug.
   * @param segment - The URL segment.
   * @param slug - The optional slug for the segment.
   * @returns A new IUrlBuilder instance.
   */
  child: (segment: string, slug?: string | number) => IUrlBuilder;

  /**
   * Overloads for page-related URL building.
   */
  page: PageOverloads;

  /**
   * Converts the URL builder to a string representation.
   * @returns The string representation of the URL.
   */
  toString: () => string;
};

/**
 * Represents information required to build a URL.
 *
 * @property {IUrlBuilder} parent - The parent URL builder instance.
 * @property {string} segment - The URL segment.
 * @property {string | number} [slug] - An optional slug that can be a string or a number.
 */
export type UrlBuilderInfo = {
  readonly parent: IUrlBuilder;
  readonly segment: string;
  readonly slug?: string | number;
};

/**
 * Represents a mapping of URLs.
 *
 * @typedef {UrlMap}
 *
 * @property {Record<string, string | Record<string, unknown>>} UrlMap -
 * A record where each key is a string and the value is either a string representing a URL
 * or another record with unknown properties.
 */
export type UrlMap = Record<string, string | Record<string, unknown>>;
