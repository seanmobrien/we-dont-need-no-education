import { ICancellablePromiseExt } from '../typescript';

/**
 * Represents the parameters required for making an API request.
 *
 * @property {URL} url - The URL to which the request is made.
 * @property {string} area - The area or domain of the API being accessed.
 * @property {string} action - The specific action or endpoint being called.
 * @property {'GET' | 'POST' | 'PUT' | 'DELETE'} method - The HTTP method used for the request.
 * @property {string | Record<string, unknown>} [input] - Optional input data to be sent with the request, can be a string or an object.
 */
export type ApiRequestParams = {
  url: URL;
  area: string;
  action: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  input?: string | Record<string, unknown>;
};

/**
 * Represents the parameters for a read API request.
 *
 * This type is derived from `ApiRequestParams` by omitting the `method` and `input` properties.
 * It is used to define the parameters required for making a read request to the API.
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
 * Helper type for making API requests.
 *
 * @template T - The type of the response data.
 */
export type ApiRequestHelper = {
  /**
   * Makes a GET request.
   *
   * @param params - The parameters for the GET request, excluding the 'area' field.
   * @returns A promise that resolves to the response data of type T.
   */
  get: <T>(
    params: Omit<ReadApiRequestParams, 'area'>
  ) => ICancellablePromiseExt<T>;

  /**
   * Makes a POST request.
   *
   * @param params - The parameters for the POST request, excluding the 'area' field.
   * @returns A promise that resolves to the response data of type T.
   */
  post: <T>(
    params: Omit<WriteApiRequestParams, 'area'>
  ) => ICancellablePromiseExt<T>;

  /**
   * Makes a PUT request.
   *
   * @param params - The parameters for the PUT request, excluding the 'area' field.
   * @returns A promise that resolves to the response data of type T.
   */
  put: <T>(
    params: Omit<WriteApiRequestParams, 'area'>
  ) => ICancellablePromiseExt<T>;

  /**
   * Makes a DELETE request.
   *
   * @param params - The parameters for the DELETE request, excluding the 'area' field.
   * @returns A promise that resolves to the response data of type T.
   */
  delete: <T>(
    params: Omit<DeleteApiRequestParams, 'area'>
  ) => ICancellablePromiseExt<T>;
};

/**
 * Parameters for making a paginated request to the API.
 *
 * @property {number} num - The number of items per page.
 * @property {number} page - The current page number.
 */
export type PaginatedRequestApiParams = {
  num?: number;
  page?: number;
};
