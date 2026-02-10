import { z } from 'zod';
import { isAiLanguageModelType, AiLanguageModelType } from '@/lib/ai/client';
import { getMappedSource, ZodProcessors } from './_common';

export type ClientEnvType = ReturnType<typeof clientEnvSchema.parse>;

export const clientRawInstance = {
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT:
    process.env.NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT ?? 5 * 60 * 1000,
  NEXT_PUBLIC_DEFAULT_AI_MODEL: process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL as AiLanguageModelType,
  NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
  NEXT_PUBLIC_LOG_LEVEL_CLIENT:
    process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT ?? 'silly',
  NEXT_PUBLIC_FLAGSMITH_API_URL: process.env.NEXT_PUBLIC_FLAGSMITH_API_URL!,
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID:
    process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID!,
  NEXT_PUBLIC_MUI_LICENSE: process.env.NEXT_PUBLIC_MUI_LICENSE,
};

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: z.string().optional(),
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: ZodProcessors.integer().default(
    5 * 60 * 1000,
  ),
  NEXT_PUBLIC_DEFAULT_AI_MODEL: z
    .string()
    .transform((val) => {
      return isAiLanguageModelType(val) ? val : ('hifi' as AiLanguageModelType);
    })
    .default('hifi' as AiLanguageModelType),
  NEXT_PUBLIC_FLAGSMITH_API_URL: z.string().min(1),
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: z.string().min(1),
  NEXT_PUBLIC_HOSTNAME: ZodProcessors.url().default('http://localhost:3000'),
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: ZodProcessors.logLevel().default('silly'),
  NEXT_PUBLIC_MUI_LICENSE: z.string().default(''),
});

export const clientEnvFactory = (): ClientEnvType =>
  clientEnvSchema.parse(getMappedSource(clientRawInstance));
