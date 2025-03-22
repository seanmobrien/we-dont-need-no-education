import { z } from 'zod';
import { ZodProcessors } from './_common';
export type ClientEnvType = ReturnType<typeof clientEnvSchema.parse>;

/**
 * An instance containing environment variables for the client-side application.
 *  IMPORTANT: NEXT_PUBLIC variables need to be directly accessed to avoid being
 *  stripped during the build process.
 *
 * @property {string | undefined} NEXT_PUBLIC_HOSTNAME - The hostname for the public-facing application.
 * @property {string | undefined} NEXT_PUBLIC_LOG_LEVEL_CLIENT - The log level for client-side logging.
 */
const clientEnvInstance = {
  NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT,
};

// Define the schema for client-side environment variables
const clientEnvSchema = z.object({
  NEXT_PUBLIC_HOSTNAME: ZodProcessors.url().default('http://localhost:3000'),
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: ZodProcessors.logLevel().default('silly'),
});

// Conditionally parse and validate the environment variables
export const clientEnvFactory = (): ClientEnvType =>
  clientEnvSchema.parse(clientEnvInstance);
