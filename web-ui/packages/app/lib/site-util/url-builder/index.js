import { env } from '@compliance-theater/env';
import { mappedUrlBuilderFactory } from './_from-map';
export { mappedUrlBuilderFactory };
export const getAbsoluteUrl = (path) => new URL(path, env('NEXT_PUBLIC_HOSTNAME'));
const siteBuilder = mappedUrlBuilderFactory();
export default siteBuilder;
//# sourceMappingURL=index.js.map