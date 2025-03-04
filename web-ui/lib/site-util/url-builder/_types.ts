import { PickField } from '@/lib/typescript';

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
  get parent(): IUrlBuilder;

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

/**
 * A type that maps a given type `TMap` to a URL builder structure.
 *
 * This type recursively maps the keys of `TMap` and `IUrlBuilder` to URL builder functions or nested URL builders.
 *
 * - If the key exists in `IUrlBuilder`, it picks the corresponding field from `IUrlBuilder`.
 * - If the key exists in `TMap`:
 *   - If the corresponding field in `TMap` is a string, it maps to a function that takes an optional slug and returns a URL.
 *   - If the corresponding field in `TMap` is a nested object, it recursively maps to another `MappedUrlBuilder`.
 *
 * @template TMap - The type to be mapped to a URL builder structure.
 */
export type MappedUrlBuilder<TMap> = {
  [K in keyof TMap | keyof IUrlBuilder]: K extends keyof IUrlBuilder
    ? PickField<IUrlBuilder, K>
    : K extends keyof TMap
    ? PickField<TMap, K> extends infer NestedMap
      ? NestedMap extends string
        ? MappedPageOverloads
        : NestedMap extends Record<string, unknown>
        ? MappedUrlBuilder<NestedMap>
        : never
      : never
    : never;
};
