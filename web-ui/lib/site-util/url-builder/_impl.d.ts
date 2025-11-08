import type { IUrlBuilder, UrlBuilderInfo } from './_types';

declare module '@/lib/site-util/url-builder/_impl' {
  /**
   * The `UrlBuilder` class is responsible for constructing and manipulating URLs
   * based on a hierarchical structure of segments and optional slugs. It provides
   * methods to build child URLs, append query parameters, and generate URL strings.
   *
   * The class supports the following features:
   * - Constructing URLs from segments and slugs.
   * - Generating child URLs based on the current URL.
   * - Appending query parameters to URLs.
   * - Handling root URLs and base paths.
   *
   * @example
   * ```typescript
   * const builder = UrlBuilder.rootBuilder.child('segment', 'slug');
   * const url = builder.page('page', { param: 'value' });
   * console.log(url.toString()); // Outputs the constructed URL
   * ```
   *
   * @implements {IUrlBuilder}
   */
  export class UrlBuilder implements IUrlBuilder {
    /**
     * Returns the root URL of the application.
     *
     * @returns The root URL constructed using the base path '/' and the hostname from the environment variable `NEXT_PUBLIC_HOSTNAME`.
     */
    static get root(): URL;

    /**
     * Returns a new instance of `UrlBuilder` with the root configuration.
     *
     * @returns A new `UrlBuilder` instance with no parent and an empty segment.
     */
    static get rootBuilder(): UrlBuilder;

    /**
     * Builds a slug part of a URL.
     *
     * @param slug - The slug to be included in the URL. It can be a string or a number.
     *               If the slug is not provided or is an empty string, an empty string is returned.
     *               If the slug is a number or a non-empty string, it returns the slug prefixed with a '/'.
     * @returns A string representing the slug part of the URL.
     */
    static buildSlugPart: (slug?: string | number) => string;

    /**
     * Constructs a new instance of the class.
     *
     * @param info - An object containing URL builder information. It can either be of type `UrlBuilderInfo`
     *               or an object with `parent` set to `null` and `segment` set to an empty string.
     *
     * @throws {TypeError} Throws an error if the provided `info` object is invalid or missing.
     */
    constructor(info: UrlBuilderInfo | { parent: null; segment: '' });

    /**
     * Gets the parent URL builder.
     *
     * @returns The parent URL builder or null if there is no parent.
     */
    get parent(): IUrlBuilder | null;

    /**
     * Gets the segment of the URL.
     *
     * @returns The segment of the URL.
     */
    get segment(): string;

    /**
     * Gets the slug of the URL.
     *
     * @returns The slug of the URL.
     */
    get slug(): string | number | undefined;

    /**
     * Gets the full relative path of the URL.
     *
     * @returns The path of the URL.
     */
    get path(): string;

    /**
     * Gets the URL object representing the current path.
     *
     * @returns The URL object representing the current path.
     */
    get url(): URL;

    /**
     * This is the same as calling `this.path`.
     * @returns The string representation of the URL.
     */
    toString(): string;

    /**
     * Creates a child URL builder with the specified segment and optional slug.
     *
     * @param segment - The segment for the child URL.
     * @param slug - The optional slug for the child URL.
     * @returns A new `UrlBuilder` instance representing the child URL.
     */
    child(segment: string, slug?: string | number): UrlBuilder;

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
    page(page: string, slug: string | number, params?: object): URL;
    page(page: string | number, params?: object): URL;
    page(params: object): URL;
    page(): URL;
  }
}
