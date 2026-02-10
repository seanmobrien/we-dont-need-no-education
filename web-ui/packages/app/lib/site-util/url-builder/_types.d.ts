declare module '@/lib/site-util/url-builder/_types' {
  /**
   * Builds a URL relative to this instance given a page segment, slug value, and query parameters.
   *
   * @overload
   * @param page - Relative page segment appended to the URL.
   * @param slug - The slug or identifier included in the URL.
   * @param params - Optional object containing URL query parameters.
   * @returns The constructed URL.
   *
   * @overload
   * @param slug - The slug or identifier included in the URL.
   * @param params - Optional object containing URL query parameters.
   * @returns The constructed URL.
   *
   * @overload
   * @param params - Optional object containing URL query parameters.
   * @returns The constructed URL.
   *
   * @overload
   * @returns The builder URL - essentially the same as accessing the url property.
   */
  export interface PageOverloads {
    (page: string, slug: string | number, params?: object): URL;
    (page: string | number, params?: object): URL;
    (params: object): URL;
    (): URL;
  }

  /**
   * Page overloads for mapped URL builders that already have a segment defined
   */
  export interface MappedPageOverloads {
    (slug: string | number, params?: object): URL;
    (params: object): URL;
    (): URL;
  }

  /**
   * Interface representing a URL builder.
   *
   * Provides a fluent API for constructing URLs with segments, slugs, and query parameters
   * in a hierarchical manner.
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
   * @property parent - The parent URL builder instance.
   * @property segment - The URL segment.
   * @property slug - An optional slug that can be a string or a number.
   */
  export type UrlBuilderInfo = {
    readonly parent: IUrlBuilder;
    readonly segment: string;
    readonly slug?: string | number;
  };

  /**
   * Represents a mapping of URLs.
   *
   * A record where each key is a string and the value is either a string representing a URL
   * or another record with unknown properties for nested URL structures.
   */
  export type UrlMap = Record<string, string | Record<string, unknown>>;
}
