/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  AdditionalRequestParams,
  ApiRequestHelper,
  DeleteApiRequestParams,
  ReadApiRequestParams,
  WriteApiRequestParams,
} from '@compliance-theater/send-api-request';

const { ApiRequestError } = jest.requireActual('@compliance-theater/send-api-request');

const sendApiRequest = jest.fn((x) => {
  return Promise.resolve({});
});

const sendApiGetRequest = (
  params: ReadApiRequestParams,
  additional: AdditionalRequestParams,
) => sendApiRequest({ method: 'get', ...params, ...additional });

const sendApiPostRequest = (
  params: WriteApiRequestParams,
  additional: AdditionalRequestParams,
) => sendApiRequest({ method: 'post', ...params, ...additional });

const sendApiDeleteRequest = (
  params: DeleteApiRequestParams,
  additional: AdditionalRequestParams,
) => sendApiRequest({ method: 'delete', ...params, ...additional });

const sendApiPutRequest = (
  params: WriteApiRequestParams,
  additional: AdditionalRequestParams,
) => sendApiRequest({ method: 'put', ...params, ...additional });

let allApiHelpers: ApiRequestHelper[] = [];

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

export {
  ApiRequestError,
  sendApiRequest,
  sendApiGetRequest,
  sendApiPostRequest,
  sendApiDeleteRequest,
  sendApiPutRequest,
  apiRequestHelperFactory,
};
