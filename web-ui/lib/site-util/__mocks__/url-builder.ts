import { mappedUrlBuilderFactory } from '../url-builder/_from-map';
import { siteMap } from '../url-builder/_sitemap';

jest.mock('../url-builder/_from-map');

const mockSiteMap = mappedUrlBuilderFactory(siteMap);

export { mappedUrlBuilderFactory };

export default mockSiteMap;
