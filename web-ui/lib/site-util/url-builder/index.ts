export type * from './_types';
import { mappedUrlBuilderFactory } from './_from-map';
import { siteMap } from './_sitemap';

const siteBuilder = mappedUrlBuilderFactory(siteMap);

export default siteBuilder;
