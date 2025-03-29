import { mappedUrlBuilderFactory } from '../url-builder/_from-map';

jest.mock('../url-builder/_from-map');

const mockSiteMap = mappedUrlBuilderFactory();

export { mappedUrlBuilderFactory };

export default mockSiteMap;
