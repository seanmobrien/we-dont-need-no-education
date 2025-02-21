import { log, errorLogFactory } from 'lib/logger';
import {
  AbortablePromise,
  ICancellablePromiseExt,
  isOperationCancelledError,
} from 'lib/typescript';
import {
  ApiRequestHelper,
  ApiRequestParams,
  DeleteApiRequestParams,
  ReadApiRequestParams,
  WriteApiRequestParams,
} from './_types';
import { ApiRequestError } from './_apiRequestError';

export const sendApiRequest = <T>({
  url,
  area,
  action,
  method,
  input,
}: ApiRequestParams): ICancellablePromiseExt<T> =>
  new AbortablePromise<T>((resolve, reject, signal) => {
    const request: RequestInit = {
      method,
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      signal,
    };
    if (!!input) {
      request.body = typeof input === 'string' ? input : JSON.stringify(input);
    }

    return fetch(url, request)
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new ApiRequestError(
            `Api failure: ${response.statusText}`,
            response
          );
        }
      })
      .then((data) => {
        log((l) =>
          l.verbose({
            source: `${area}.${action}`,
            url,
            method,
            data,
          })
        );
        resolve(data);
      })
      .catch((error) => {
        if (isOperationCancelledError(error)) {
          return;
        }
        log((l) =>
          l.error(
            errorLogFactory({
              error,
              source: `${area}.${action}`,
              url,
              method,
              response: error.response,
            })
          )
        );
        reject(error);
      });
  });

export const sendApiGetRequest = <T>(
  props: ReadApiRequestParams
): ICancellablePromiseExt<T> => sendApiRequest<T>({ ...props, method: 'GET' });

export const sendApiPostRequest = <T>(
  props: WriteApiRequestParams
): ICancellablePromiseExt<T> => sendApiRequest<T>({ ...props, method: 'POST' });

export const sendApiPutRequest = <T>(
  props: WriteApiRequestParams
): ICancellablePromiseExt<T> => sendApiRequest<T>({ ...props, method: 'PUT' });

export const sendApiDeleteRequest = <T>(
  props: DeleteApiRequestParams
): ICancellablePromiseExt<T> =>
  sendApiRequest<T>({ ...props, method: 'DELETE' });

export const apiRequestHelperFactory = ({
  area,
}: {
  area: string;
}): ApiRequestHelper => {
  const addArea = <T>(params: T): T & { area: string } => ({ ...params, area });
  return {
    get: <T>(params: Omit<ReadApiRequestParams, 'area'>) =>
      sendApiGetRequest<T>(addArea(params)),
    post: <T>(params: Omit<WriteApiRequestParams, 'area'>) =>
      sendApiPostRequest<T>(addArea(params)),
    put: <T>(params: Omit<WriteApiRequestParams, 'area'>) =>
      sendApiPutRequest<T>(addArea(params)),
    delete: <T>(params: Omit<DeleteApiRequestParams, 'area'>) =>
      sendApiDeleteRequest<T>(addArea(params)),
  };
};
