import type {
  PageOverloads,
  MappedPageOverloads,
  IUrlBuilder,
  UrlBuilderInfo,
  UrlMap,
} from './_types';
import { mappedUrlBuilderFactory } from './_from-map';

declare module '@/lib/site-util/url-builder' {
  export { mappedUrlBuilderFactory };
  export type {
    PageOverloads,
    MappedPageOverloads,
    UrlMap,
    IUrlBuilder,
    UrlBuilderInfo,
  };

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
  export function getAbsoluteUrl(path: string): URL;

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
