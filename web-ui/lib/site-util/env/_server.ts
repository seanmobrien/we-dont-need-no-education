import { z } from 'zod';
import { isRunningOnClient, ZodProcessors } from './_common';
import { clientEnvFactory } from './_client';

// Define the schema for server-side environment variables
const serverEnvSchema = z.object({
  // BEGIN vars shared with client
  NEXT_PUBLIC_HOSTNAME: ZodProcessors.url(),
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: ZodProcessors.logLevel(),
  // END NEXT_PUBLIC env vars
  LOG_LEVEL_SERVER: ZodProcessors.logLevel(),
  DATABASE_URL: ZodProcessors.url(),
  DATABASE_URL_UNPOOLED: ZodProcessors.url(),
  AUTH_GOOGLE_ID: z.string(),
  AUTH_GOOGLE_SECRET: z.string(),
  AUTH_GOOGLE_APIKEY: z.string(),
  REDIS_URL: z.string().min(1),
  REDIS_PASSWORD: z.string().min(1),
});

export type ServerEnvType = ReturnType<typeof serverEnvSchema.parse>;

export const serverEnvFactory = (): ServerEnvType => {
  try {
    return isRunningOnClient()
      ? ({} as ServerEnvType)
      : serverEnvSchema.parse(process.env);
  } catch (e) {
    // Check an environment variable to verify really are running on server
    if ((process.env.DATABASE_URL ?? '').length === 0) {
      // We aren't - suppresss (arguably could return client here)
      return clientEnvFactory() as ServerEnvType;
    }
    // Otherwise, rethrow the error
    throw e;
  }
};
