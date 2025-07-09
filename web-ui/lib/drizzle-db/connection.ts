import { drizzle } from 'drizzle-orm/postgres-js';
import sql from '../neondb/connection';
import schema from './schema';
// You can specify any property from the postgres-js connection options
export const db = drizzle({
  client: sql,
  casing: 'snake_case',
  schema,
});
export { schema };
export type Database = typeof db;
