import { drizzle } from 'drizzle-orm/postgres-js';
import sql from './connection';
import * as schema from '@/drizzle/schema';
import * as relations from '@/drizzle/relations';

// You can specify any property from the postgres-js connection options
export const db = drizzle({
  client: sql,
  casing: 'snake_case',
  schema: { ...schema, ...relations },
});
export { schema, relations };
