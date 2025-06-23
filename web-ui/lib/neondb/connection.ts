import postgres from 'postgres';
import { env, isRunningOnEdge } from '@/lib/site-util/env';

const sql = (() => {
  // If running in a test environment, return a mock implementation
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined
  ) {
    return jest.fn().mockImplementation(() => {
      console.warn('How did you get here?', new Error().stack);
      return {
        end: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue({}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as postgres.Sql<any>;
    });
  }
  // If running on the edge, return a no-op implementation
  if (isRunningOnEdge()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fnNoOp: (...args: any[]) => any = () => {
      console.warn(
        'No database connection avialable.  This is likely because you are running in a test environment or on the edge.',
      );
      return Promise.resolve(fnNoOp);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fnNoOp as any).end = fnNoOp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fnNoOp as any).query = fnNoOp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fnNoOp as postgres.Sql<any>;
  }
  // In all other cases, create a new postgres connection
  return postgres(env('DATABASE_URL'), {
    ssl: 'verify-full',
    max: 3,
    debug: true,
  });
})() as postgres.Sql;

// Singleton pattern to prevent multiple prexit handler registrations during hot reloads
let prexitHandlerRegistered = false;

if (process.env.NEXT_RUNTIME === 'nodejs' && !prexitHandlerRegistered) {
  prexitHandlerRegistered = true;
  await import('prexit')
    .then((x) => x.default)
    .then((prexit) => {
      prexit(async () => {
        console.log('Closing database connection.');
        await (sql?.end({ timeout: 5 }) ?? Promise.resolve());
        console.log('Cleanly closed database connection.');
      });
    });
}

export default sql;
