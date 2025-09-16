import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { schema, drizDbWithInit } from '@/lib/drizzle-db';

export const setupDrizzleAdapter = () =>
  drizDbWithInit((db) =>
    DrizzleAdapter(db, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      usersTable: schema.users as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accountsTable: schema.accounts as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionsTable: schema.sessions as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      verificationTokensTable: schema.verificationTokens as any,
    }),
  );
