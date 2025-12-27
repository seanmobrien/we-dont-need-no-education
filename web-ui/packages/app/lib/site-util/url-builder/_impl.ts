import { mappedPageOverloadFactory } from './_from-map';
import { IUrlBuilder, MappedPageOverloads, UrlBuilderInfo } from './_types';
import { env } from '@repo/lib-site-util-env';

const appendParams = (url: URL, params: object | undefined) => {
  if (!params) {
    return url;
  }
  const copy = new URL(url);
  if (params) {
    const serializeParam = (
      q: URLSearchParams,
      key: string,
      value: unknown,
    ) => {
      if (typeof value !== 'number' && !value) {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((v) => serializeParam(q, key, v));
      } else if (typeof value === 'object') {
        q.append(key, JSON.stringify(value));
      } else {
        q.append(key, String(value));
      }
    };
    copy.search = Object.keys(params)
      .reduce((q, key) => {
        const value = params[key as keyof typeof params];
        serializeParam(q, key, value);
        return q;
      }, copy.searchParams ?? new URLSearchParams())
      .toString();
  }
  return copy;
};

export class UrlBuilder implements IUrlBuilder {
  /**
   * Returns the root URL of the application.
   *
   * @returns {URL} The root URL constructed using the base path '/' and the hostname from the environment variable `NEXT_PUBLIC_HOSTNAME`.
   */
  static get root(): URL {
    return new URL('/', env('NEXT_PUBLIC_HOSTNAME'));
  }

  /**
   * Returns a new instance of `UrlBuilder` with the root configuration.
   *
   * @returns {UrlBuilder} A new `UrlBuilder` instance with no parent and an empty segment.
   */
  static get rootBuilder(): UrlBuilder {
    return new UrlBuilder({
      parent: null as unknown as IUrlBuilder,
      segment: '',
    });
  }

  /**
   * Builds a slug part of a URL.
   *
   * @param slug - The slug to be included in the URL. It can be a string or a number.
   *               If the slug is not provided or is an empty string, an empty string is returned.
   *               If the slug is a number or a non-empty string, it returns the slug prefixed with a '/'.
   * @returns A string representing the slug part of the URL.
   */
  static buildSlugPart = (slug?: string | number) =>
    typeof slug !== 'number' && !slug ? '' : `/${slug}`;

  /**
   * Private data representing this URL builder.
   */
  private readonly info: UrlBuilderInfo;

  /**
   * Constructs a new instance of the class.
   *
   * @param info - An object containing URL builder information. It can either be of type `UrlBuilderInfo`
   *               or an object with `parent` set to `null` and `segment` set to an empty string.
   *
   * @throws {TypeError} Throws an error if the provided `info` object is invalid or missing.
   */
  constructor(info: UrlBuilderInfo | { parent: null; segment: '' }) {
    if (
      !info ||
      typeof info !== 'object' ||
      !('segment' in info && 'parent' in info)
    ) {
      throw new TypeError(
        `invalid or missing info object provided: ${JSON.stringify(
          info ?? 'null',
        )}`,
      );
    }
    this.info = info as UrlBuilderInfo;
    this.route = mappedPageOverloadFactory(this, this.info.segment);
  }

  /**
   * Retrieves the path of the parent if it exists.
   *
   * @returns {string} The path of the parent if `this.info.parent` is not null; otherwise, an empty string.
   */
  private get parentPart(): string {
    return this.info.parent == null ? '' : this.info.parent.path;
  }
  route: MappedPageOverloads;
  /**
   * Gets the slug part formatted for a URL.
   *
   * @returns {string} The slug part of the URL.
   */
  private get slugPart(): string {
    return UrlBuilder.buildSlugPart(this.info.slug);
  }
  /**
   * Returns a URL object representing the current path with a trailing slash appended.
   * The base URL is the root URL of the application.
   *
   * @private
   * @returns {URL} The URL object with a trailing slash.
   */
  private get urlWithSlash(): URL {
    return new URL(`${this.path}/`, UrlBuilder.root);
  }

  /**
   * Gets the parent URL builder.
   *
   * @returns {IUrlBuilder | null} The parent URL builder or null if there is no parent.
   */
  get parent(): IUrlBuilder | null {
    return this.info.parent;
  }

  /**
   * Gets the segment of the URL.
   *
   * @returns {string} The segment of the URL.
   */
  get segment(): string {
    return this.info.segment;
  }

  /**
   * Gets the slug of the URL.
   *
   * @returns {string | number | undefined} The slug of the URL.
   */
  get slug(): string | number | undefined {
    return this.info.slug;
  }

  /**
   * Gets the full relative path of the URL.
   *
   * @returns {string} The path of the URL.
   */
  get path(): string {
    const p = `${this.parentPart}/${this.info.segment}${this.slugPart}`;
    return p.endsWith('/') ? p.slice(0, -1) : p;
  }
  /**
   * Gets the URL object representing the current path.
   *
   * @returns {URL} The URL object representing the current path.
   */
  get url(): URL {
    return new URL(this.path, UrlBuilder.root);
  }

  /**
   * This is the same as calling `this.path`.
   * @returns {string} The string representation of the URL.
   */
  toString(): string {
    return this.path;
  }

  /**
   * Creates a child URL builder with the specified segment and optional slug.
   *
   * @param segment - The segment for the child URL.
   * @param slug - The optional slug for the child URL.
   * @returns {UrlBuilder} A new `UrlBuilder` instance representing the child URL.
   */
  child(segment: string, slug?: string | number): UrlBuilder {
    return new UrlBuilder({ parent: this, segment, slug });
  }
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
  page(page: string, slug: string | number, params?: object): URL;
  page(page: string | number, params?: object): URL;
  page(params: object): URL;
  page(): URL;
  page(
    page?: number | string | object,
    slug?: string | number | object,
    params?: object,
  ) {
    if (typeof page === 'undefined') {
      return this.url;
    }
    if (typeof page === 'object') {
      return appendParams(this.url, page);
    }
    const normalizedPage = String(page);
    if (normalizedPage.indexOf('/') > -1) {
      throw new Error('Invalid page name.');
    }
    if (typeof slug === 'undefined') {
      return new URL(normalizedPage, this.urlWithSlash);
    }
    if (typeof slug === 'object') {
      return appendParams(new URL(normalizedPage, this.urlWithSlash), slug);
    }
    if (typeof slug === 'string' && slug.indexOf('/') > -1) {
      throw new Error('Invalid slug name.');
    }
    const urlPart = new URL(`${normalizedPage}/${slug}`, this.urlWithSlash);
    return typeof params === 'undefined'
      ? urlPart
      : appendParams(urlPart, params);
  }
}
