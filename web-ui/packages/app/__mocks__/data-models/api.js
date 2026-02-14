const actualApi = jest.requireActual('/data-models/api');
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
const contactCacheInstance = new contactCacheClass();
const globalContactCache = () => {
    return contactCacheInstance;
};
const contactCacheFactory = () => contactCacheInstance;
const moduleInstance = {
    ...actualApi,
    globalContactCache,
    contactCacheFactory,
};
export default moduleInstance;
//# sourceMappingURL=api.js.map