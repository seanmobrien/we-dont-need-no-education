export type * from './_types';
import { mappedUrlBuilderFactory } from './_from-map';
import { siteMap } from './_sitemap';

export { mappedUrlBuilderFactory };

const siteBuilder = mappedUrlBuilderFactory();

export default siteBuilder;
