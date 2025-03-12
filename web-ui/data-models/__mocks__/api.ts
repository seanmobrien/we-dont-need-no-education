import { ContactCache } from '@/data-models/api/contact-cache';

const actualApi = jest.requireActual('@/data-models/api');

const contactCacheClass = jest.fn(() => {
  const ret = {
    add: jest.fn(),
    get: jest.fn(),
    getByEmail: jest.fn(),
    remove: jest.fn(),
    getAll: jest.fn(),
    clear: jest.fn(),
    has: jest.fn(),
    hasByEmail: jest.fn(),
  };
  ret.get.mockReturnValue(undefined);
  ret.getByEmail.mockReturnValue(undefined);
  return ret;
});
let contactCacheInstance = new contactCacheClass();

const globalContactCache = (): ContactCache => {
  console.log('in mocked contact cache accessor');
  return contactCacheInstance;
};
const contactCacheFactory = (): ContactCache => contactCacheInstance;

const moduleInstance = {
  ...actualApi,
  globalContactCache,
  contactCacheFactory,
};

export default moduleInstance;
