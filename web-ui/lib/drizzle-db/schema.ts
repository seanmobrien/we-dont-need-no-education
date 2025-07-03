import * as tables from '@/drizzle/schema';
import * as relations from '@/drizzle/custom-relations';

const schema = { ...tables, ...relations };
export default schema;
