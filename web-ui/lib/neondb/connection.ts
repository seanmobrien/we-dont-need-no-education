import postgres from 'postgres';
import { env, isRunningOnEdge } from '@/lib/site-util/env';

const isTestEnvironment = () => {
  return (
    process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined
  );
};

console.log('Connecting to database...');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fnNoOp: (...args: any[]) => any = () => {
  console.warn('No database connection avialable.  This is likely because you are running in a test environment or on the edge.');
  return Promise.resolve(fnNoOp);
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(fnNoOp as any).end = fnNoOp;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(fnNoOp as any).query = fnNoOp;

const sql = isTestEnvironment()
  ? jest.fn().mockImplementation(() => {
      console.warn('How did you get here?', new Error().stack);
      return {
        end: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue({}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as postgres.Sql<any>;
    })()
  : isRunningOnEdge()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? fnNoOp as postgres.Sql<any>
    : postgres(env('DATABASE_URL'), { ssl: 'verify-full', max: 3, debug: true });

// Singleton pattern to prevent multiple prexit handler registrations during hot reloads
let prexitHandlerRegistered = false;

if (process.env.NEXT_RUNTIME === 'nodejs' && !prexitHandlerRegistered) {
  prexitHandlerRegistered = true;
  await (import('prexit')
    .then(x => x.default))
    .then(prexit => {
      prexit(async () => {
          console.log('Closing database connection.');
          await (sql?.end({ timeout: 5 }) ?? Promise.resolve());
          console.log('Cleanly closed database connection.');
        });
    });  
}

export default sql;
