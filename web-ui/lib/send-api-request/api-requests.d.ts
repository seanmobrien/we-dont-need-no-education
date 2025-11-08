/**
 * API request utility functions
 * @module @/lib/send-api-request/api-requests
 */
import type { ApiRequestFunction, ApiRequestHelper } from './types';
declare module '@/lib/send-api-request/api-requests' {
  /**
   * Sends an API request with the specified parameters.
   *
   * This is the core function for making API requests with support for:
   * - Credential forwarding from Next.js requests
   * - Cancellable promises
   * - Automatic error handling with ApiRequestError
   * - Type-safe response handling
   *
   * @template T - The expected type of the response data
   * @param params - The API request parameters
   * @returns A cancellable promise that resolves to the response data
   * @throws {ApiRequestError} When the API request fails
   *
   * @example
   * ```typescript
   * const data = await sendApiRequest<User>({
   *   url: new URL('/api/users', baseUrl),
   *   area: 'users',
   *   action: 'list',
   *   method: 'GET',
   *   req: request,
   * });
   * ```
   */
  export const sendApiRequest: ApiRequestFunction;

  /**
   * Creates an API request helper for a specific area.
   *
   * This factory function returns an object with convenience methods (get, post, put, delete)
   * that are pre-configured for the specified API area, reducing repetition in API calls.
   *
   * @param area - The API area/domain for which to create the helper
   * @returns An ApiRequestHelper object with methods for each HTTP verb
   *
   * @example
   * ```typescript
   * const usersApi = createApiRequestHelper('users');
   *
   * // GET request
   * const users = await usersApi.get<User[]>({
   *   url: new URL('/api/users', baseUrl),
   *   action: 'list',
   * });
   *
   * // POST request
   * const newUser = await usersApi.post<User>({
   *   url: new URL('/api/users', baseUrl),
   *   action: 'create',
   *   input: { name: 'John', email: 'john@example.com' },
   * });
   * ```
   */
  export function createApiRequestHelper(area: string): ApiRequestHelper;
}
