declare module '@/lib/site-util/url-builder' {
  import { IUrlBuilder } from './_impl';

  export type {
    PageOverloads,
    MappedPageOverloads,
    IUrlBuilder,
    UrlBuilderInfo,
    UrlMap,
  } from './_types';

  export { mappedUrlBuilderFactory } from './_from-map';

  /**
   * Gets an absolute URL from a path using the application's hostname
   *
   * @param path - Relative path to convert to absolute URL
   * @returns Absolute URL object
   *
   * @example
   * ```typescript
   * const url = getAbsoluteUrl('/api/users');
   * console.log(url.href); // "https://example.com/api/users"
   * ```
   */
  export const getAbsoluteUrl: (path: string) => URL;

  /**
   * Default site URL builder instance
   *
   * Pre-configured URL builder for the entire site based on the sitemap.
   * Provides type-safe navigation to all defined routes.
   *
   * @example
   * ```typescript
   * import siteBuilder from '@/lib/site-util/url-builder';
   *
   * const userUrl = siteBuilder.users.page(123);
   * ```
   */
  const siteBuilder: IUrlBuilder;
  export default siteBuilder;
}
