import { log } from '@compliance-theater/lib-logger';
import { AbortablePromise, ICancellablePromiseExt } from '@compliance-theater/lib-typescript';
import type {
  AdditionalRequestParams,
  ApiRequestHelper,
  ApiRequestParams,
  DeleteApiRequestParams,
  ReadApiRequestParams,
  WriteApiRequestParams,
} from './types';
import { ApiRequestError } from './api-request-error';
import { LoggedError } from '../react-util/errors/logged-error';
import { getHeaderValue } from '../nextjs-util';
import { fetch } from '@/lib/nextjs-util/fetch';

/**
 * Sends an API request with the specified parameters.
 *
 * @template T - The type of the response data.
 * @param {ApiRequestParams} params - The parameters for the API request.
 * @param {string} params.url - The URL to send the request to.
 * @param {string} params.area - The area of the API being accessed.
 * @param {string} params.action - The specific action being performed.
 * @param {string} params.method - The HTTP method to use for the request.
 * @param {any} [params.input] - The input data to send with the request.
 * @param {Request} [params.req] - The server request object, if available.
 * @param {boolean} [params.forwardCredentials=true] - Whether to forward credentials (cookies) with the request.
 * @returns {ICancellablePromiseExt<T>} A promise that resolves with the response data or rejects with an error.
 */
export const sendApiRequest = <T>({
  url,
  area,
  action,
  method,
  input,
  req: serverRequest,
  forwardCredentials = true,
}: ApiRequestParams): ICancellablePromiseExt<T> =>
  new AbortablePromise<T>(async (resolveOuter, rejectOuter, signal) => {
    try {
      // Build request headers, including forwarded auth cookies if necessary
      const headers = new Headers({
        'Content-Type': 'application/json',
      });
      // If we're on the server and we're forwarding credentials, add the cookies to the request
      if (serverRequest && forwardCredentials) {
        const rawCookieHeader = getHeaderValue(serverRequest, 'cookie');
        if (rawCookieHeader) {
          if (Array.isArray(rawCookieHeader)) {
            headers.append('Cookie', rawCookieHeader.join(';'));
          } else {
            headers.append('Cookie', String(rawCookieHeader));
          }
        }
      }
      // Use headers to initialize the request object
      const request: RequestInit = {
        method,
        headers,
        signal,
      };
      // Add the request body if one exists, serializing when appropriate
      if (input) {
        request.body =
          typeof input === 'string' ? input : JSON.stringify(input);
      }
      // Send all of this off to the fetch API to do its thing
      const response = await fetch(String(url), request);
      if (!response.ok) {
        let errorMessage = `Api failure: ${response.statusText}`;
        let errorData;
        const errorBody = await response.text();
        try {
          errorData = JSON.parse(errorBody);
          errorMessage += ` - ${
            errorData.message || JSON.stringify(errorData)
          }`;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          errorData = errorBody;
          errorMessage += ` - ${errorData}`;
        }
        rejectOuter(new ApiRequestError(errorMessage, response));
      }
      const contentType = response.headers.get('Content-Type');
      const data =
        contentType && contentType.includes('application/json')
          ? await response.json()
          : await response.text();
      log((l) =>
        l.verbose({
          source: `${area}.${action}`,
          message: `API request completed for [${url}]`,
          url,
          method,
          data,
        }),
      );
      resolveOuter(data);
      return data;
    } catch (error) {
      rejectOuter(
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: `${area}.${action}`,
          message: `API request failed for [${url}]`,
          url,
          method,
        }),
      );
    }
  });

/**
 * Sends an API GET request.
 *
 * @template T - The type of the response data.
 * @param {ReadApiRequestParams} props - The parameters for the API request.
 * @param {AdditionalRequestParams} [additional] - Additional parameters for the API request.
 * @param {Function} [additional.sendApiRequest] - Optional custom function to send the API request.
 * @returns {ICancellablePromiseExt<T>} A cancellable promise that resolves with the response data.
 */
export const sendApiGetRequest = <T>(
  props: ReadApiRequestParams,
  {
    sendApiRequest: sendApiRequestInProps,
    ...additional
  }: AdditionalRequestParams = {},
): ICancellablePromiseExt<T> =>
  (sendApiRequestInProps ?? sendApiRequest)<T>({
    ...props,
    ...additional,
    method: 'GET',
  });

/**
 * Sends a POST request to the API.
 *
 * @template T - The type of the response data.
 * @param {WriteApiRequestParams} props - The parameters for the API request.
 * @param {AdditionalRequestParams} [additional] - Additional parameters for the API request.
 * @param {Function} [additional.sendApiRequest] - Optional custom function to send the API request.
 * @returns {ICancellablePromiseExt<T>} A promise that resolves to the response data.
 */
export const sendApiPostRequest = <T>(
  props: WriteApiRequestParams,
  {
    sendApiRequest: sendApiRequestInProps,
    ...additional
  }: AdditionalRequestParams = {},
): ICancellablePromiseExt<T> =>
  (sendApiRequestInProps ?? sendApiRequest)<T>({
    ...props,
    ...additional,
    method: 'POST',
  });

/**
 * Sends an API PUT request.
 *
 * @template T - The type of the response data.
 * @param {WriteApiRequestParams} props - The parameters for the API request.
 * @param {AdditionalRequestParams} [additional] - Additional parameters for the API request.
 * @param {Function} [additional.sendApiRequest] - Optional custom function to send the API request.
 * @returns {ICancellablePromiseExt<T>} A promise that resolves to the response data.
 */
export const sendApiPutRequest = <T>(
  props: WriteApiRequestParams,
  {
    sendApiRequest: sendApiRequestInProps,
    ...additional
  }: AdditionalRequestParams = {},
): ICancellablePromiseExt<T> =>
  (sendApiRequestInProps ?? sendApiRequest)<T>({
    ...props,
    ...additional,
    method: 'PUT',
  });

/**
 * Sends an API DELETE request.
 *
 * @template T - The type of the response data.
 * @param {DeleteApiRequestParams} props - The parameters for the DELETE request.
 * @param {AdditionalRequestParams} [additional] - Additional parameters for the request.
 * @param {Function} [additional.sendApiRequest] - Optional custom function to send the API request.
 * @returns {ICancellablePromiseExt<T>} A cancellable promise that resolves to the response data of type T.
 */
export const sendApiDeleteRequest = <T>(
  props: DeleteApiRequestParams,
  {
    sendApiRequest: sendApiRequestInProps,
    ...additional
  }: AdditionalRequestParams = {},
): ICancellablePromiseExt<T> =>
  (sendApiRequestInProps ?? sendApiRequest)<T>({
    ...props,
    ...additional,
    method: 'DELETE',
  });

/**
 * Factory function to create an API request helper for a specific area.
 *
 * @param {Object} options - The options for the API request helper.
 * @param {string} options.area - The area to be included in the API request parameters.
 * @returns {ApiRequestHelper} An object containing methods for making API requests (get, post, put, delete).
 *
 * @template T - The type of the response data.
 */
export const apiRequestHelperFactory = ({
  area,
}: {
  area: string;
}): ApiRequestHelper => {
  const addArea = <T>(params: T): T & { area: string } => ({
    ...params,
    area,
  });
  return {
    get: <T>(
      params: Omit<ReadApiRequestParams, 'area'>,
      additional?: AdditionalRequestParams,
    ) => sendApiGetRequest<T>(addArea(params), additional),
    post: <T>(
      params: Omit<WriteApiRequestParams, 'area'>,
      additional?: AdditionalRequestParams,
    ) => sendApiPostRequest<T>(addArea(params), additional),
    put: <T>(
      params: Omit<WriteApiRequestParams, 'area'>,
      additional?: AdditionalRequestParams,
    ) => sendApiPutRequest<T>(addArea(params), additional),
    delete: <T>(
      params: Omit<DeleteApiRequestParams, 'area'>,
      additional?: AdditionalRequestParams,
    ) => sendApiDeleteRequest<T>(addArea(params), additional),
  };
};
