import { z } from 'zod';
import { ZodProcessors } from './_common';

export type ClientEnvType = ReturnType<typeof clientEnvSchema.parse>;

// Define the schema for client-side environment variables
const clientEnvSchema = z.object({
  NEXT_PUBLIC_HOSTNAME: ZodProcessors.url().default('http://localhost:3000'),
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: ZodProcessors.logLevel().default('silly'),
});

// Conditionally parse and validate the environment variables
export const clientEnvFactory = (): ClientEnvType =>
  clientEnvSchema.parse(process.env);
