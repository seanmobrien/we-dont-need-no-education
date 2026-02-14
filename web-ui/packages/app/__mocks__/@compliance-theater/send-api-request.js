const { ApiRequestError } = jest.requireActual('@compliance-theater/send-api-request');
const sendApiRequest = jest.fn((x) => {
    return Promise.resolve({});
});
const sendApiGetRequest = (params, additional) => sendApiRequest({ method: 'get', ...params, ...additional });
const sendApiPostRequest = (params, additional) => sendApiRequest({ method: 'post', ...params, ...additional });
const sendApiDeleteRequest = (params, additional) => sendApiRequest({ method: 'delete', ...params, ...additional });
const sendApiPutRequest = (params, additional) => sendApiRequest({ method: 'put', ...params, ...additional });
let allApiHelpers = [];
const apiRequestHelperFactory = jest.fn((params) => {
    const ret = {
        get: jest.fn((x, y) => sendApiGetRequest({ ...params, ...x }, y)),
        post: jest.fn((x, y) => sendApiPostRequest({ ...params, ...x }, y)),
        put: jest.fn((x, y) => sendApiPutRequest({ ...params, ...x }, y)),
        delete: jest.fn((x, y) => sendApiDeleteRequest({ ...params, ...x }, y)),
        mockedHelpers: () => [...allApiHelpers],
    };
    return ret;
});
beforeEach(() => {
    sendApiRequest.mockClear();
    sendApiRequest.mockResolvedValue({});
    allApiHelpers = [];
    sendApiRequest.mockImplementation(() => {
        return Promise.resolve({});
    });
});
export { ApiRequestError, sendApiRequest, sendApiGetRequest, sendApiPostRequest, sendApiDeleteRequest, sendApiPutRequest, apiRequestHelperFactory, };
//# sourceMappingURL=send-api-request.js.map