/**
 * @module neondb
 * This module provides a connection to the Neon database using the serverless adapter.
 */

import { FullQueryResults, neon, NeonQueryFunction, NeonQueryPromise, QueryRows } from '@neondatabase/serverless';

const connection = () => {
  const ret = typeof process.env.DATABASE_URL === 'string' ? process.env.DATABASE_URL : '';
  if (ret === '') {
    throw new Error('DATABASE_URL is not set');
  }
  return ret;
};

/**
 * Executes a query against the Neon database.
 *
 * @param cb - A callback function that receives a NeonQueryFunction and returns a NeonQueryPromise.
 * @returns A NeonQueryPromise that resolves to the query results.
 * @type {(cb: (sql: NeonQueryFunction<false, false>) => NeonQueryPromise<false, false, QueryRows<false>>) => NeonQueryPromise<false, false, QueryRows<false>>}
 */
export const query = (
  cb: (
    sql: NeonQueryFunction<false, false>
  ) => NeonQueryPromise<boolean, boolean, QueryRows<boolean>>
): NeonQueryPromise<boolean, boolean, QueryRows<boolean>> =>
  cb(neon(connection(), { fullResults: false }));


 /**
 * Executes a query against the Neon database with extended results.
 *
 * @param cb - A callback function that receives a NeonQueryFunction and returns a NeonQueryPromise with full query results.
 * @returns A NeonQueryPromise that resolves to the full query results.
 * @type {(cb: (sql: NeonQueryFunction<false, true>) => NeonQueryPromise<false, true, FullQueryResults<boolean>>) => NeonQueryPromise<false, true, FullQueryResults<true>>}
 */
export const queryExt = (
  cb: (
    sql: NeonQueryFunction<false, true>
  ) => NeonQueryPromise<boolean, boolean, FullQueryResults<boolean>>
): NeonQueryPromise<boolean, boolean, FullQueryResults<boolean>> => 
  cb(neon(connection(), { fullResults: true }));
  
