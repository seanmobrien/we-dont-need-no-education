export type {
  PageOverloads,
  MappedPageOverloads,
  IUrlBuilder,
  UrlBuilderInfo,
  UrlMap,
} from './_types';
import { env } from '@repo/lib-site-util-env';
import { mappedUrlBuilderFactory } from './_from-map';

export { mappedUrlBuilderFactory };

export const getAbsoluteUrl = (path: string): URL =>
  new URL(path, env('NEXT_PUBLIC_HOSTNAME'));

const siteBuilder = mappedUrlBuilderFactory();

export default siteBuilder;
