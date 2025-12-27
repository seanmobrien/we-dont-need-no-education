import { ICancellablePromiseExt } from '@compliance-theater/lib-typescript';
import { NextRequest } from 'next/server';
import { NextApiRequest } from 'next';
import { UrlObject } from 'url';
import { SiteRoute } from '../site-util/url-builder/_types';

/**
 * Represents the parameters required for making an API request.
 *
 * @property {URL} url - The URL to which the request is made.
 * @property {string} area - The area or domain of the API being accessed.
 * @property {string} action - The specific action or endpoint being called.
 * @property {'GET' | 'POST' | 'PUT' | 'DELETE'} method - The HTTP method used for the request.
 * @property {string | Record<string, unknown>} [input] - Optional input data to be sent with the request, can be a string or an object.
 * @preperty {NextRequest | NextApiRequest} req - The active request object
 * @property {boolean} [forwardCredentials] - Whether to forward credentials to the endpoint.  True by default when the request property is provided.
 */
export type ApiRequestParams = {
  url: UrlObject | SiteRoute;
  area: string;
  action: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  input?: string | Record<string, unknown>;
  req?: NextRequest | NextApiRequest;
  forwardCredentials?: boolean;
};

/**
 * A function type that represents an API request.
 *
 * @template T - The type of the response data.
 * @param {ApiRequestParams} apiRequest - The parameters for the API request.
 * @returns {ICancellablePromiseExt<T>} A cancellable promise that resolves to the response data of type T.
 */
export type ApiRequestFunction = <T>(
  apiRequest: ApiRequestParams,
) => ICancellablePromiseExt<T>;

/**
 * Represents the parameters for a read API request.
 *
 * This type is derived from `ApiRequestParams` by omitting the `method`, `input`,
 * and `req` properties. It is used to define the parameters required for making a
 * read request to the API.
 */
export type ReadApiRequestParams = Omit<ApiRequestParams, 'method' | 'input'>;

/**
 * Type alias for `DeleteApiRequestParams` which is equivalent to `ReadApiRequestParams`.
 * This type is used to define the parameters required for a delete API request.
 */
export type DeleteApiRequestParams = ReadApiRequestParams;

/**
 * Type definition for the parameters of a write API request.
 *
 * This type is derived from `ApiRequestParams` by omitting the `method` and `input` properties,
 * and then adding a new `input` property that can be either a string or a record with string keys and unknown values.
 *
 * @typeParam ApiRequestParams - The base type for API request parameters.
 * @property input - The input data for the API request, which can be a string or a record with string keys and unknown values.
 */
export type WriteApiRequestParams = Omit<
  ApiRequestParams,
  'method' | 'input'
> & { input: string | Record<string, unknown> };

/**
 * Represents additional request parameters for an API request.
 *
 * This type is a partial version of `ApiRequestParams` with the `method` property omitted.
 * It allows specifying any subset of the properties from `ApiRequestParams`, except for `method`.
 * @property {ApiRequestFunction} sendApiRequest - An optional function that can be used for dependency injection
 * to override the default API request function.
 */
export type AdditionalRequestParams = Partial<
  Omit<ApiRequestParams, 'method'>
> & {
  sendApiRequest?: ApiRequestFunction;
};
/**
 * Helper type for making API requests.
 *
 * @template T - The type of the response data.
 */
export type ApiRequestHelper = {
  /**
   * Makes a GET request.
   *
   * @param params - The parameters for the GET request, excluding the 'area' field.
   * @param additional - Optional additional parameters for the API request.
   * @returns A promise that resolves to the response data of type T.
   */
  get: <T>(
    params: Omit<ReadApiRequestParams, 'area'>,
    additional?: AdditionalRequestParams,
  ) => ICancellablePromiseExt<T>;

  /**
   * Makes a POST request.
   *
   * @param params - The parameters for the POST request, excluding the 'area' field.
   * @param additional - Optional additional parameters for the API request.
   * @returns A promise that resolves to the response data of type T.
   */
  post: <T>(
    params: Omit<WriteApiRequestParams, 'area'>,
    additional?: AdditionalRequestParams,
  ) => ICancellablePromiseExt<T>;

  /**
   * Makes a PUT request.
   *
   * @param params - The parameters for the PUT request, excluding the 'area' field.
   * @param additional - Optional additional parameters for the API request.
   * @returns A promise that resolves to the response data of type T.
   */
  put: <T>(
    params: Omit<WriteApiRequestParams, 'area'>,
    additional?: AdditionalRequestParams,
  ) => ICancellablePromiseExt<T>;

  /**
   * Makes a DELETE request.
   *
   * @param params - The parameters for the DELETE request, excluding the 'area' field.
   * @param additional - Optional additional parameters for the API request.
   * @returns A promise that resolves to the response data of type T.
   */
  delete: <T>(
    params: Omit<DeleteApiRequestParams, 'area'>,
    additional?: AdditionalRequestParams,
  ) => ICancellablePromiseExt<T>;
};
