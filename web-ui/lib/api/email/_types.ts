import { PaginatedRequestApiParams } from '../_types';

/**
 * Parameters for the email search API.
 *
 * @extends PaginatedRequestApiParams
 *
 * @property {number[] | number} [contactId] - An optional contact ID or array of contact IDs to filter the search.
 * @property {string} [query] - **(Obsolete)** An optional search query. Use `q` instead.
 * @property {string} [q] - An optional search query.
 */
export type EmailSearchApiParams = PaginatedRequestApiParams & {
  contactId?: number[] | number;
  query?: string;
  q?: string;
};
