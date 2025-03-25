import postgres from 'postgres';
import prexit from 'prexit';
import { env } from '@/lib/site-util/env';

const isTestEnvironment = () => {
  return (
    process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined
  );
};

const sql = isTestEnvironment()
  ? jest.fn().mockImplementation(() => {
      console.warn('How did you get here?', new Error().stack);
      return {
        end: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue({}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as postgres.Sql<any>;
    })()
  : postgres(env('DATABASE_URL'), { ssl: 'verify-full' });

if (!!process?.on && isTestEnvironment()) {
  prexit(async () => {
    console.log('Closing database connection.');
    await (sql?.end({ timeout: 5 }) ?? Promise.resolve());
    console.log('Cleanly closed database connection.');
  });
}

export default sql;
