export type * from './_types';
import { mappedUrlBuilderFactory } from './_from-map';

export { mappedUrlBuilderFactory };

const siteBuilder = mappedUrlBuilderFactory();

export default siteBuilder;
