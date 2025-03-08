import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { Pool } from '@neondatabase/serverless';
import PostgresAdapter from '@auth/pg-adapter';
import { query } from './lib/neondb';

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  // Create a `Pool` inside the request handler.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = PostgresAdapter(pool);
  return {
    // debug: true,
    adapter,
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            access_type: 'offline',
            prompt: 'consent',
            response_type: 'code',
            scope:
              'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly', //
          },
        },
      }),
    ],
    callbacks: {
      authorized: async ({ auth }) => {
        // Logged in users are authenticated, otherwise redirect to login page
        return !!auth;
      },
      signIn: async ({ account }) => {
        // Update refresh token if provided
        if (account && account.refresh_token) {
          const records = await query(
            (sql) =>
              sql`UPDATE accounts SET access_token=${account.access_token}, refresh_token = ${account.refresh_token} WHERE provider='google' AND "providerAccountId" = ${account.providerAccountId} RETURNING *`
          );
          if (!records.length) {
            throw new Error('Failed to update account');
          }
          console.log('updated token');
        }
        // Add user to database
        return true;
      },
    },
  };
});
