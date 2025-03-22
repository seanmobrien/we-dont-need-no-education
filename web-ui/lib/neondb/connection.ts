import postgres from 'postgres';
import prexit from 'prexit';
import { env } from '@/lib/site-util/env';

const sql = postgres(env('DATABASE_URL'), { ssl: 'verify-full' });
if (!!process?.on) {
  prexit(async () => {
    console.log('Closing database connection.');
    await sql.end({ timeout: 5 });
    console.log('Cleanly closed database connection.');
  });
}

export default sql;
